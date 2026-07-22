"""
GraphRAG Retrieval Engine — Research-Grade Pipeline

A multi-strategy, graph-aware retrieval-augmented generation pipeline
for ethnomedicinal plant knowledge graphs.

Pipeline stages:
  1. Query Analysis    — intent classification, entity extraction & linking
  2. Multi-Strategy    — entity match, keyword SQL, graph traversal, subgraph
  3. Hybrid Ranking    — weighted scoring with diversity enforcement (MMR)
  4. Context Assembly  — structured, path-aware context with provenance

Author: OMEDB Research Project
"""

from __future__ import annotations

import heapq
import math
import re
import sqlite3
import time
from collections import defaultdict
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from enum import Enum
from pathlib import Path
from typing import Optional

from graph import load_graph, DB_PATH

# ═══════════════════════════════════════════════════════════════════════════════
# Data types
# ═══════════════════════════════════════════════════════════════════════════════


class QueryIntent(str, Enum):
    PLANT_LOOKUP = "plant_lookup"
    CONDITION_QUERY = "condition_query"
    COMPOUND_QUERY = "compound_query"
    FAMILY_QUERY = "family_query"
    COMPARISON = "comparison"
    MECHANISM = "mechanism"
    GENERAL = "general"


@dataclass
class LinkedEntity:
    node_id: str
    node_type: str
    label: str
    match_score: float
    match_method: str  # "exact", "substring", "fuzzy"
    query_span: str  # the token(s) in the query that matched


@dataclass
class QueryAnalysis:
    intent: QueryIntent
    entities: list[LinkedEntity]
    keywords: list[str]
    raw_query: str
    language: str  # "en" or "ar"


@dataclass
class GraphPath:
    """A chain of (node_id, edge_type, node_id, ...) through the KG."""
    nodes: list[str]
    edges: list[str]
    total_weight: float

    @property
    def length(self) -> int:
        return len(self.edges)

    def describe(self, node_labels: dict[str, str]) -> str:
        parts = [node_labels.get(self.nodes[0], self.nodes[0])]
        for i, etype in enumerate(self.edges):
            parts.append(f"--{etype}-->")
            parts.append(node_labels.get(self.nodes[i + 1], self.nodes[i + 1]))
        return " ".join(parts)


@dataclass
class RetrievalResult:
    node_id: str
    node_type: str
    label: str
    db_id: Optional[int]
    score: float
    strategies: list[str]
    paths: list[GraphPath] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class PlantContext:
    """Fully hydrated plant record for context assembly."""
    db_id: int
    scientific_name: str
    local_name: Optional[str]
    family: Optional[str]
    part_used: Optional[str]
    traditional_use: Optional[str]
    conditions: list[str]
    compounds: list[str]
    score: float
    relevance_reason: str
    paths: list[GraphPath]


@dataclass
class RetrievalOutput:
    """Final output of the pipeline, consumed by the chatbot."""
    query_analysis: QueryAnalysis
    plants: list[PlantContext]
    relationship_paths: list[str]
    shared_compounds: list[dict]
    assembled_context: str
    metadata: dict


# ═══════════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════════

STOPWORDS = {
    "what", "which", "where", "how", "why", "who", "when",
    "is", "are", "was", "were", "be", "been", "being",
    "the", "a", "an", "in", "on", "at", "of", "for", "to",
    "and", "or", "but", "not", "with", "from", "by", "about",
    "that", "this", "these", "those", "it", "its",
    "do", "does", "did", "have", "has", "had",
    "can", "could", "would", "should", "may", "might",
    "plant", "plants", "oman", "omani", "traditional",
    "used", "use", "uses", "treat", "treating", "treated", "treatment",
    "tell", "me", "list", "give", "find", "show", "know", "any",
    "some", "all", "most", "many", "much", "more", "also",
}

# Edge weights for graph traversal (lower = more relevant)
EDGE_WEIGHTS = {
    "TREATS": 1.0,
    "CONTAINS": 1.2,
    "BELONGS_TO": 1.5,
    # Derived plant<->plant links: useful for "similar plants" reasoning but
    # weaker than asserted facts, so they cost more to traverse.
    "CO_TREATS": 1.4,
    "SHARES_COMPOUND": 1.6,
}

# Ranking weights
W_MATCH = 0.30
W_CENTRALITY = 0.15
W_PATH = 0.30
W_DENSITY = 0.10
W_STRATEGY = 0.15

# Intent signal words
INTENT_SIGNALS = {
    QueryIntent.PLANT_LOOKUP: {
        "about", "describe", "information", "details", "profile",
        "tell me about", "what is", "local name",
    },
    QueryIntent.CONDITION_QUERY: {
        "treat", "treats", "treating", "cure", "remedy", "help",
        "disease", "disorder", "ailment", "condition", "infection",
        "pain", "fever", "diabetes", "skin", "wound", "healing",
    },
    QueryIntent.COMPOUND_QUERY: {
        "contain", "contains", "compound", "phytochemical", "chemical",
        "constituent", "extract", "molecule", "substance",
    },
    QueryIntent.FAMILY_QUERY: {
        "family", "families", "genus", "taxa", "taxonomic",
        "classification", "belong", "belongs",
    },
    QueryIntent.COMPARISON: {
        "compare", "comparison", "versus", "vs", "differ", "difference",
        "similar", "similarity", "between", "both", "common",
    },
    QueryIntent.MECHANISM: {
        "mechanism", "pathway", "how does", "why does", "action",
        "bioactive", "activity", "pharmacological", "efficacy",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Query Analyzer
# ═══════════════════════════════════════════════════════════════════════════════


class QueryAnalyzer:
    """Classifies query intent, extracts keywords, links entities to KG nodes."""

    def __init__(self, graph: dict):
        self._graph = graph
        self._node_map: dict[str, dict] = {n["id"]: n for n in graph["nodes"]}
        self._entity_index: dict[str, list[dict]] = defaultdict(list)
        self._build_entity_index()

    def _build_entity_index(self):
        """Build a token → node index for fast entity linking."""
        for node in self._graph["nodes"]:
            label = node["label"].lower().strip()
            # Index full label
            self._entity_index[label].append(node)
            # Index individual words for partial matching
            for word in label.split():
                w = word.strip("(),-;:.'\"")
                if len(w) > 2:
                    self._entity_index[w].append(node)
            # Index local names for plants
            if node.get("local_name"):
                for ln in node["local_name"].split(","):
                    ln = ln.strip().lower()
                    if ln:
                        self._entity_index[ln].append(node)

    def analyze(self, query: str) -> QueryAnalysis:
        lang = self._detect_language(query)
        intent = self._classify_intent(query)
        keywords = self._extract_keywords(query)
        entities = self._link_entities(query, keywords)

        # Refine intent based on entity types found
        if entities and intent == QueryIntent.GENERAL:
            type_counts = defaultdict(int)
            for e in entities:
                type_counts[e.node_type] += 1
            if type_counts.get("Condition", 0) > 0:
                intent = QueryIntent.CONDITION_QUERY
            elif type_counts.get("Compound", 0) > 0:
                intent = QueryIntent.COMPOUND_QUERY
            elif type_counts.get("Plant", 0) > 0:
                intent = QueryIntent.PLANT_LOOKUP

        return QueryAnalysis(
            intent=intent,
            entities=entities,
            keywords=keywords,
            raw_query=query,
            language=lang,
        )

    def _detect_language(self, query: str) -> str:
        arabic_chars = len(re.findall(r"[؀-ۿ]", query))
        latin_chars = len(re.findall(r"[a-zA-Z]", query))
        return "ar" if arabic_chars > latin_chars else "en"

    def _classify_intent(self, query: str) -> QueryIntent:
        q = query.lower()
        scores: dict[QueryIntent, float] = defaultdict(float)
        for intent, signals in INTENT_SIGNALS.items():
            for signal in signals:
                if signal in q:
                    scores[intent] += 1.0 + (0.5 * len(signal.split()))
        if not scores:
            return QueryIntent.GENERAL
        return max(scores, key=lambda k: scores[k])

    def _extract_keywords(self, query: str) -> list[str]:
        tokens = re.findall(r"[a-zA-Z؀-ۿ]+", query.lower())
        singles = [t for t in tokens if len(t) > 2 and t not in STOPWORDS]
        # Bigrams (for multi-word entity names)
        bigrams = [f"{tokens[i]} {tokens[i + 1]}" for i in range(len(tokens) - 1)]
        # Trigrams (for three-word names like "wound healing plants")
        trigrams = [
            f"{tokens[i]} {tokens[i + 1]} {tokens[i + 2]}"
            for i in range(len(tokens) - 2)
        ]
        return list(dict.fromkeys(trigrams + bigrams + singles))

    def _link_entities(self, query: str, keywords: list[str]) -> list[LinkedEntity]:
        q_lower = query.lower()
        entities: list[LinkedEntity] = []
        seen_node_ids: set[str] = set()

        # Pass 1 — exact substring match against full labels
        for label, nodes in self._entity_index.items():
            if len(label) > 2 and label in q_lower:
                for node in nodes:
                    if node["id"] not in seen_node_ids:
                        seen_node_ids.add(node["id"])
                        score = min(1.0, len(label) / max(len(q_lower), 1))
                        # Boost exact matches on full node label
                        if label == node["label"].lower():
                            score = max(score, 0.9)
                        entities.append(LinkedEntity(
                            node_id=node["id"],
                            node_type=node["type"],
                            label=node["label"],
                            match_score=score,
                            match_method="exact" if label == node["label"].lower() else "substring",
                            query_span=label,
                        ))

        # Pass 2 — fuzzy match for unresolved keywords
        if len(entities) < 3:
            all_labels = {
                node["label"].lower(): node
                for node in self._graph["nodes"]
            }
            for kw in keywords[:10]:
                for label, node in all_labels.items():
                    if node["id"] in seen_node_ids:
                        continue
                    ratio = SequenceMatcher(None, kw, label).ratio()
                    if ratio >= 0.75:
                        seen_node_ids.add(node["id"])
                        entities.append(LinkedEntity(
                            node_id=node["id"],
                            node_type=node["type"],
                            label=node["label"],
                            match_score=ratio,
                            match_method="fuzzy",
                            query_span=kw,
                        ))

        # Sort by score descending
        entities.sort(key=lambda e: e.match_score, reverse=True)
        return entities[:15]


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Multi-Strategy Retriever
# ═══════════════════════════════════════════════════════════════════════════════


class GraphRetriever:
    """Runs four retrieval strategies and merges results."""

    def __init__(self, graph: dict, db_path: Path = DB_PATH):
        self._graph = graph
        self._db_path = db_path
        self._node_map: dict[str, dict] = {n["id"]: n for n in graph["nodes"]}

        # Build adjacency list for fast traversal
        self._adj: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
        for e in graph["edges"]:
            src, tgt, etype = e["source"], e["target"], e["type"]
            self._adj[src].append((tgt, etype, "forward"))
            self._adj[tgt].append((src, etype, "reverse"))

        # Pre-compute degree centrality
        degree: dict[str, int] = defaultdict(int)
        for e in graph["edges"]:
            degree[e["source"]] += 1
            degree[e["target"]] += 1
        max_deg = max(degree.values()) if degree else 1
        self._centrality = {nid: d / max_deg for nid, d in degree.items()}

    def retrieve(self, analysis: QueryAnalysis) -> list[RetrievalResult]:
        all_results: dict[str, RetrievalResult] = {}

        # Strategy A: Direct entity match + 1-hop
        for r in self._strategy_entity_match(analysis):
            self._merge_result(all_results, r)

        # Strategy B: SQL keyword search
        for r in self._strategy_keyword_sql(analysis):
            self._merge_result(all_results, r)

        # Strategy C: Weighted multi-hop graph traversal
        for r in self._strategy_graph_traversal(analysis):
            self._merge_result(all_results, r)

        # Strategy D: Subgraph extraction (intent-dependent)
        if analysis.intent in (
            QueryIntent.CONDITION_QUERY,
            QueryIntent.MECHANISM,
            QueryIntent.COMPARISON,
        ):
            for r in self._strategy_subgraph(analysis):
                self._merge_result(all_results, r)

        return list(all_results.values())

    def _merge_result(self, pool: dict[str, RetrievalResult], new: RetrievalResult):
        if new.node_id in pool:
            existing = pool[new.node_id]
            existing.score = max(existing.score, new.score)
            existing.strategies.extend(new.strategies)
            existing.paths.extend(new.paths)
        else:
            pool[new.node_id] = new

    def centrality(self, node_id: str) -> float:
        return self._centrality.get(node_id, 0.0)

    # ── Strategy A: Entity Match ──────────────────────────────────────────

    def _strategy_entity_match(self, analysis: QueryAnalysis) -> list[RetrievalResult]:
        results = []
        for entity in analysis.entities:
            node = self._node_map.get(entity.node_id)
            if not node:
                continue
            results.append(RetrievalResult(
                node_id=entity.node_id,
                node_type=node["type"],
                label=node["label"],
                db_id=node.get("db_id"),
                score=entity.match_score,
                strategies=["entity_match"],
            ))
            # Add 1-hop neighbors
            for neighbor_id, etype, direction in self._adj.get(entity.node_id, []):
                nb = self._node_map.get(neighbor_id)
                if nb and nb["type"] == "Plant":
                    results.append(RetrievalResult(
                        node_id=neighbor_id,
                        node_type="Plant",
                        label=nb["label"],
                        db_id=nb.get("db_id"),
                        score=entity.match_score * 0.6,
                        strategies=["entity_match_1hop"],
                        paths=[GraphPath(
                            nodes=[entity.node_id, neighbor_id],
                            edges=[etype],
                            total_weight=EDGE_WEIGHTS.get(etype, 1.0),
                        )],
                    ))
        return results

    # ── Strategy B: Keyword SQL ───────────────────────────────────────────

    def _strategy_keyword_sql(self, analysis: QueryAnalysis) -> list[RetrievalResult]:
        results = []
        con = sqlite3.connect(self._db_path)
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        seen: set[int] = set()
        for kw in analysis.keywords[:8]:
            q = f"%{kw}%"

            # Search plants by name
            cur.execute(
                "SELECT id, scientific_name FROM plants "
                "WHERE LOWER(scientific_name) LIKE ? OR LOWER(local_name) LIKE ? "
                "OR LOWER(traditional_use) LIKE ? LIMIT 10",
                (q, q, q),
            )
            for row in cur.fetchall():
                if row["id"] not in seen:
                    seen.add(row["id"])
                    # Score: primary field match > secondary
                    sci = row["scientific_name"].lower()
                    score = 0.85 if kw in sci else 0.55
                    results.append(RetrievalResult(
                        node_id=f"plant:{row['id']}",
                        node_type="Plant",
                        label=row["scientific_name"],
                        db_id=row["id"],
                        score=score,
                        strategies=["keyword_sql"],
                    ))

            # Search via conditions
            cur.execute(
                "SELECT DISTINCT p.id, p.scientific_name FROM plants p "
                "JOIN plant_conditions pc ON pc.plant_id = p.id "
                "JOIN conditions c ON c.id = pc.condition_id "
                "WHERE LOWER(c.name) LIKE ? LIMIT 15",
                (q,),
            )
            for row in cur.fetchall():
                if row["id"] not in seen:
                    seen.add(row["id"])
                    results.append(RetrievalResult(
                        node_id=f"plant:{row['id']}",
                        node_type="Plant",
                        label=row["scientific_name"],
                        db_id=row["id"],
                        score=0.70,
                        strategies=["keyword_sql_condition"],
                    ))

            # Search via compounds
            cur.execute(
                "SELECT DISTINCT p.id, p.scientific_name FROM plants p "
                "JOIN plant_compounds pc ON pc.plant_id = p.id "
                "JOIN compounds comp ON comp.id = pc.compound_id "
                "WHERE LOWER(comp.name) LIKE ? LIMIT 10",
                (q,),
            )
            for row in cur.fetchall():
                if row["id"] not in seen:
                    seen.add(row["id"])
                    results.append(RetrievalResult(
                        node_id=f"plant:{row['id']}",
                        node_type="Plant",
                        label=row["scientific_name"],
                        db_id=row["id"],
                        score=0.65,
                        strategies=["keyword_sql_compound"],
                    ))

        con.close()
        return results

    # ── Strategy C: Weighted Graph Traversal ──────────────────────────────

    def _strategy_graph_traversal(self, analysis: QueryAnalysis) -> list[RetrievalResult]:
        if not analysis.entities:
            return []

        # Proper weighted shortest-path traversal (Dijkstra) seeded from every
        # linked entity. A binary heap + `settled` set guarantees each node is
        # finalised once at its true minimum cost; the depth bound stops the
        # search from wandering too far through the graph.
        MAX_DEPTH = 3
        dist: dict[str, float] = {}
        depth_of: dict[str, int] = {}
        parent: dict[str, tuple[str, str]] = {}  # child -> (parent, edge_type)
        settled: set[str] = set()
        results = []

        # (cost, depth, node_id) — node_id breaks ties deterministically
        heap: list[tuple[float, int, str]] = []
        for entity in analysis.entities[:5]:
            if 0.0 < dist.get(entity.node_id, float("inf")):
                dist[entity.node_id] = 0.0
                depth_of[entity.node_id] = 0
                heapq.heappush(heap, (0.0, 0, entity.node_id))

        while heap:
            cost, depth, nid = heapq.heappop(heap)
            if nid in settled:
                continue
            settled.add(nid)
            if depth >= MAX_DEPTH:
                continue

            for neighbor_id, etype, direction in self._adj.get(nid, []):
                if neighbor_id in settled:
                    continue
                edge_w = EDGE_WEIGHTS.get(etype, 2.0)
                new_cost = cost + edge_w
                if new_cost < dist.get(neighbor_id, float("inf")):
                    dist[neighbor_id] = new_cost
                    depth_of[neighbor_id] = depth + 1
                    parent[neighbor_id] = (nid, etype)
                    heapq.heappush(heap, (new_cost, depth + 1, neighbor_id))

        # Extract Plant nodes from traversal results
        for nid, total_cost in dist.items():
            node = self._node_map.get(nid)
            if not node or node["type"] != "Plant" or total_cost == 0.0:
                continue

            # Reconstruct path
            path_nodes = [nid]
            path_edges = []
            curr = nid
            while curr in parent:
                p, etype = parent[curr]
                path_nodes.insert(0, p)
                path_edges.insert(0, etype)
                curr = p

            score = 1.0 / (1.0 + total_cost)
            results.append(RetrievalResult(
                node_id=nid,
                node_type="Plant",
                label=node["label"],
                db_id=node.get("db_id"),
                score=score,
                strategies=["graph_traversal"],
                paths=[GraphPath(
                    nodes=path_nodes,
                    edges=path_edges,
                    total_weight=total_cost,
                )],
            ))

        return results

    # ── Strategy D: Subgraph Extraction ───────────────────────────────────

    def _strategy_subgraph(self, analysis: QueryAnalysis) -> list[RetrievalResult]:
        results = []
        condition_entities = [
            e for e in analysis.entities if e.node_type == "Condition"
        ]
        if not condition_entities:
            return results

        for entity in condition_entities[:2]:
            cond_id = entity.node_id
            # Find all plants treating this condition
            for neighbor_id, etype, _ in self._adj.get(cond_id, []):
                node = self._node_map.get(neighbor_id)
                if node and node["type"] == "Plant":
                    results.append(RetrievalResult(
                        node_id=neighbor_id,
                        node_type="Plant",
                        label=node["label"],
                        db_id=node.get("db_id"),
                        score=0.80,
                        strategies=["subgraph_condition"],
                        paths=[GraphPath(
                            nodes=[neighbor_id, cond_id],
                            edges=[etype],
                            total_weight=1.0,
                        )],
                    ))
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Hybrid Ranker
# ═══════════════════════════════════════════════════════════════════════════════


class HybridRanker:
    """Scores and re-ranks candidates with diversity enforcement (MMR)."""

    def __init__(self, retriever: GraphRetriever):
        self._retriever = retriever

    def rank(
        self,
        candidates: list[RetrievalResult],
        top_k: int = 10,
    ) -> list[RetrievalResult]:
        if not candidates:
            return []

        # Filter to Plant nodes only (we hydrate plants for context)
        plants = [c for c in candidates if c.node_type == "Plant"]
        if not plants:
            return candidates[:top_k]

        # Compute composite scores
        for c in plants:
            match_score = c.score
            centrality = self._retriever.centrality(c.node_id)
            path_score = max(
                (1.0 / (1.0 + p.total_weight) for p in c.paths), default=0.0
            )
            density = len(set(c.strategies)) / 4.0  # up to 4 strategies
            strategy_bonus = len(set(c.strategies)) * 0.1

            c.score = (
                W_MATCH * match_score
                + W_CENTRALITY * centrality
                + W_PATH * path_score
                + W_DENSITY * density
                + W_STRATEGY * strategy_bonus
            )

        # Sort by composite score
        plants.sort(key=lambda c: c.score, reverse=True)

        # MMR diversity re-ranking
        selected: list[RetrievalResult] = []
        remaining = list(plants)

        while remaining and len(selected) < top_k:
            if not selected:
                selected.append(remaining.pop(0))
                continue

            # Penalize candidates that share family with already-selected
            best_idx = 0
            best_adjusted = -1.0
            selected_families = set()
            for s in selected:
                fam = self._get_family(s.node_id)
                if fam:
                    selected_families.add(fam)

            for i, cand in enumerate(remaining):
                adjusted = cand.score
                cand_fam = self._get_family(cand.node_id)
                if cand_fam and cand_fam in selected_families:
                    adjusted *= 0.85  # diversity penalty
                if adjusted > best_adjusted:
                    best_adjusted = adjusted
                    best_idx = i

            selected.append(remaining.pop(best_idx))

        return selected

    def _get_family(self, node_id: str) -> Optional[str]:
        for neighbor_id, etype, _ in self._retriever._adj.get(node_id, []):
            if etype == "BELONGS_TO":
                node = self._retriever._node_map.get(neighbor_id)
                if node and node["type"] == "Family":
                    return node["label"]
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Context Assembler
# ═══════════════════════════════════════════════════════════════════════════════


def hydrate_plants(
    ranked: list[RetrievalResult],
    db_path: Path = DB_PATH,
) -> list[PlantContext]:
    """Fetch full plant data from SQLite for top-ranked results."""
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    plants: list[PlantContext] = []
    for r in ranked:
        if r.db_id is None:
            continue
        cur.execute(
            "SELECT scientific_name, local_name, family, part_used, traditional_use "
            "FROM plants WHERE id = ?",
            (r.db_id,),
        )
        row = cur.fetchone()
        if not row:
            continue

        cur.execute(
            "SELECT c.name FROM conditions c "
            "JOIN plant_conditions pc ON pc.condition_id = c.id "
            "WHERE pc.plant_id = ?",
            (r.db_id,),
        )
        conditions = [x["name"] for x in cur.fetchall()]

        cur.execute(
            "SELECT comp.name FROM compounds comp "
            "JOIN plant_compounds pc ON pc.compound_id = comp.id "
            "WHERE pc.plant_id = ?",
            (r.db_id,),
        )
        compounds = [x["name"] for x in cur.fetchall()]

        # Build relevance reason from strategies
        strategies = list(set(r.strategies))
        reason_parts = []
        if "entity_match" in strategies:
            reason_parts.append("direct entity match")
        if "keyword_sql_condition" in strategies or "subgraph_condition" in strategies:
            reason_parts.append("treats queried condition")
        if "keyword_sql_compound" in strategies:
            reason_parts.append("contains queried compound")
        if "graph_traversal" in strategies:
            reason_parts.append("graph-connected")
        if "keyword_sql" in strategies:
            reason_parts.append("keyword match")
        reason = ", ".join(reason_parts) if reason_parts else "related"

        plants.append(PlantContext(
            db_id=r.db_id,
            scientific_name=row["scientific_name"],
            local_name=row["local_name"],
            family=row["family"],
            part_used=row["part_used"],
            traditional_use=row["traditional_use"],
            conditions=conditions,
            compounds=compounds,
            score=r.score,
            relevance_reason=reason,
            paths=r.paths,
        ))

    con.close()
    return plants


def find_shared_compounds(plants: list[PlantContext]) -> list[dict]:
    """Identify compounds shared across multiple retrieved plants."""
    compound_to_plants: dict[str, list[str]] = defaultdict(list)
    for p in plants:
        for comp in p.compounds:
            compound_to_plants[comp].append(p.scientific_name)

    shared = [
        {"compound": comp, "plants": plist}
        for comp, plist in compound_to_plants.items()
        if len(plist) >= 2
    ]
    shared.sort(key=lambda x: len(x["plants"]), reverse=True)
    return shared[:10]


def find_relationship_paths(
    plants: list[PlantContext],
    analysis: QueryAnalysis,
    retriever: GraphRetriever,
) -> list[str]:
    """Extract notable graph paths for relational reasoning."""
    node_labels = {n["id"]: n["label"] for n in retriever._graph["nodes"]}
    paths: list[str] = []

    # Paths from traversal results
    for p in plants[:6]:
        for gp in p.paths[:2]:
            if gp.length >= 2:
                desc = gp.describe(node_labels)
                paths.append(desc)

    # Co-treatment paths: plants sharing a condition
    if len(plants) >= 2:
        for i, p1 in enumerate(plants[:4]):
            for p2 in plants[i + 1 : 6]:
                common_conds = set(p1.conditions) & set(p2.conditions)
                for cond in list(common_conds)[:2]:
                    paths.append(
                        f"{p1.scientific_name} --TREATS--> {cond} "
                        f"<--TREATS-- {p2.scientific_name} (co-treatment)"
                    )

    # Shared compound paths
    if len(plants) >= 2:
        for i, p1 in enumerate(plants[:4]):
            for p2 in plants[i + 1 : 6]:
                common_comps = set(p1.compounds) & set(p2.compounds)
                for comp in list(common_comps)[:2]:
                    paths.append(
                        f"{p1.scientific_name} --CONTAINS--> {comp} "
                        f"<--CONTAINS-- {p2.scientific_name} (shared compound)"
                    )

    return paths[:12]


def assemble_context(
    plants: list[PlantContext],
    relationship_paths: list[str],
    shared_compounds: list[dict],
    analysis: QueryAnalysis,
) -> str:
    """Build structured, citation-ready context string for the LLM."""
    sections: list[str] = []

    # ── Section 1: Retrieved Plants ──
    if plants:
        plant_blocks = []
        for i, p in enumerate(plants, 1):
            block = f"[Plant {i}/{len(plants)}] {p.scientific_name}"
            if p.local_name:
                block += f" (Local: {p.local_name})"
            block += f"\n  Family: {p.family or 'Unknown'}"
            block += f"\n  Part used: {p.part_used or 'Not specified'}"
            block += f"\n  Traditional use: {p.traditional_use or 'Not documented'}"
            if p.conditions:
                block += f"\n  Conditions treated: {', '.join(p.conditions)}"
            if p.compounds:
                shown = p.compounds[:8]
                block += f"\n  Key compounds: {', '.join(shown)}"
                if len(p.compounds) > 8:
                    block += f" (+{len(p.compounds) - 8} more)"
            block += f"\n  Relevance: {p.relevance_reason} (score: {p.score:.2f})"
            plant_blocks.append(block)
        sections.append(
            "<retrieved_plants>\n" + "\n\n".join(plant_blocks) + "\n</retrieved_plants>"
        )

    # ── Section 2: Graph Relationships ──
    if relationship_paths:
        sections.append(
            "<graph_relationships>\n"
            + "\n".join(f"- {p}" for p in relationship_paths)
            + "\n</graph_relationships>"
        )

    # ── Section 3: Shared Compounds ──
    if shared_compounds:
        sc_lines = []
        for sc in shared_compounds[:6]:
            sc_lines.append(
                f"- {sc['compound']}: found in {', '.join(sc['plants'])}"
            )
        sections.append(
            "<shared_compounds>\n" + "\n".join(sc_lines) + "\n</shared_compounds>"
        )

    # ── Section 4: Retrieval Metadata ──
    entity_info = "; ".join(
        f'"{e.query_span}" -> {e.node_type}:{e.label} ({e.match_method}, {e.match_score:.2f})'
        for e in analysis.entities[:5]
    )
    meta = (
        f"Query intent: {analysis.intent.value}\n"
        f"Language: {analysis.language}\n"
        f"Entities linked: {entity_info or 'none'}\n"
        f"Plants retrieved: {len(plants)}"
    )
    sections.append("<retrieval_metadata>\n" + meta + "\n</retrieval_metadata>")

    return "\n\n".join(sections) if sections else "No relevant data found."


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Pipeline Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════


class GraphRAGPipeline:
    """Top-level orchestrator: query → analysis → retrieval → ranking → context."""

    def __init__(self):
        self._graph: Optional[dict] = None
        self._analyzer: Optional[QueryAnalyzer] = None
        self._retriever: Optional[GraphRetriever] = None
        self._ranker: Optional[HybridRanker] = None

    def _ensure_loaded(self):
        if self._graph is None:
            self._graph = load_graph()
            self._analyzer = QueryAnalyzer(self._graph)
            self._retriever = GraphRetriever(self._graph)
            self._ranker = HybridRanker(self._retriever)

    def retrieve(self, query: str, top_k: int = 10) -> RetrievalOutput:
        self._ensure_loaded()
        t0 = time.time()

        # Stage 1: Query Analysis
        analysis = self._analyzer.analyze(query)

        # Stage 2: Multi-Strategy Retrieval
        candidates = self._retriever.retrieve(analysis)

        # Stage 3: Hybrid Ranking
        ranked = self._ranker.rank(candidates, top_k=top_k)

        # Stage 4: Context Assembly
        plants = hydrate_plants(ranked)
        shared = find_shared_compounds(plants)
        paths = find_relationship_paths(plants, analysis, self._retriever)
        context = assemble_context(plants, paths, shared, analysis)

        elapsed = time.time() - t0

        return RetrievalOutput(
            query_analysis=analysis,
            plants=plants,
            relationship_paths=paths,
            shared_compounds=shared,
            assembled_context=context,
            metadata={
                "retrieval_latency_ms": round(elapsed * 1000, 1),
                "total_candidates": len(candidates),
                "ranked_returned": len(ranked),
                "strategies_used": list(set(
                    s for c in candidates for s in c.strategies
                )),
                "intent": analysis.intent.value,
                "entities_linked": len(analysis.entities),
            },
        )
