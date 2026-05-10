"""
Knowledge graph builder and traversal engine.

Node types : Plant, Condition, Compound, Family
Edge types  : TREATS, CONTAINS, BELONGS_TO, SHARES_COMPOUND, CO_TREATS
"""

import sqlite3
import json
from pathlib import Path
from collections import defaultdict

DB_PATH = Path(__file__).parent / "omani_ethno.db"
GRAPH_PATH = Path(__file__).parent / "knowledge_graph.json"


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def build_graph() -> dict:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    # ---- Plant nodes ----
    cur.execute("SELECT id, scientific_name, local_name, family FROM plants")
    for r in cur.fetchall():
        nid = f"plant:{r['id']}"
        nodes[nid] = {
            "id": nid,
            "type": "Plant",
            "label": r["scientific_name"],
            "local_name": r["local_name"],
            "db_id": r["id"],
        }
        # BELONGS_TO edge to Family
        if r["family"]:
            fid = f"family:{r['family'].replace(' ', '_')}"
            if fid not in nodes:
                nodes[fid] = {"id": fid, "type": "Family", "label": r["family"]}
            edges.append({"source": nid, "target": fid, "type": "BELONGS_TO"})

    # ---- Condition nodes + TREATS edges ----
    cur.execute("SELECT id, name FROM conditions")
    for r in cur.fetchall():
        cid = f"condition:{r['id']}"
        nodes[cid] = {"id": cid, "type": "Condition", "label": r["name"], "db_id": r["id"]}

    cur.execute("SELECT plant_id, condition_id FROM plant_conditions")
    for r in cur.fetchall():
        edges.append({
            "source": f"plant:{r['plant_id']}",
            "target": f"condition:{r['condition_id']}",
            "type": "TREATS",
        })

    # ---- Compound nodes + CONTAINS edges ----
    cur.execute("SELECT id, name, imppat_id FROM compounds")
    for r in cur.fetchall():
        cid = f"compound:{r['id']}"
        nodes[cid] = {
            "id": cid,
            "type": "Compound",
            "label": r["name"],
            "imppat_id": r["imppat_id"],
            "db_id": r["id"],
        }

    cur.execute("SELECT plant_id, compound_id FROM plant_compounds")
    for r in cur.fetchall():
        edges.append({
            "source": f"plant:{r['plant_id']}",
            "target": f"compound:{r['compound_id']}",
            "type": "CONTAINS",
        })

    # ---- CO_TREATS (plants sharing a condition) ----
    # Group plants by condition
    cur.execute("SELECT condition_id, plant_id FROM plant_conditions ORDER BY condition_id")
    cond_plants: dict[int, list[int]] = defaultdict(list)
    for r in cur.fetchall():
        cond_plants[r["condition_id"]].append(r["plant_id"])

    # ---- SHARES_COMPOUND (plants sharing a compound) ----
    cur.execute("SELECT compound_id, plant_id FROM plant_compounds ORDER BY compound_id")
    comp_plants: dict[int, list[int]] = defaultdict(list)
    for r in cur.fetchall():
        comp_plants[r["compound_id"]].append(r["plant_id"])

    con.close()

    graph = {
        "nodes": list(nodes.values()),
        "edges": edges,
        # pre-computed indexes for fast traversal
        "_condition_plants": {k: v for k, v in cond_plants.items()},
        "_compound_plants":  {k: v for k, v in comp_plants.items()},
    }

    GRAPH_PATH.write_text(json.dumps(graph, ensure_ascii=False, indent=2))
    print(f"Graph: {len(nodes)} nodes, {len(edges)} edges → {GRAPH_PATH}")
    return graph


# ---------------------------------------------------------------------------
# Traversal helpers
# ---------------------------------------------------------------------------

def load_graph() -> dict:
    if not GRAPH_PATH.exists():
        return build_graph()
    return json.loads(GRAPH_PATH.read_text())


def get_plant_neighborhood(plant_id: int, depth: int = 2) -> dict:
    """Return the sub-graph around a plant (conditions, compounds, family, related plants)."""
    g = load_graph()
    root = f"plant:{plant_id}"

    # BFS
    visited: set[str] = {root}
    frontier = [root]
    for _ in range(depth):
        next_frontier = []
        for nid in frontier:
            for edge in g["edges"]:
                if edge["source"] == nid and edge["target"] not in visited:
                    visited.add(edge["target"])
                    next_frontier.append(edge["target"])
                elif edge["target"] == nid and edge["source"] not in visited:
                    visited.add(edge["source"])
                    next_frontier.append(edge["source"])
        frontier = next_frontier

    node_map = {n["id"]: n for n in g["nodes"]}
    sub_nodes = [node_map[v] for v in visited if v in node_map]
    sub_edges = [
        e for e in g["edges"]
        if e["source"] in visited and e["target"] in visited
    ]
    return {"nodes": sub_nodes, "edges": sub_edges}


def get_condition_subgraph(condition_id: int) -> dict:
    """Return all plants + their compounds for a given condition."""
    g = load_graph()
    cond_node_id = f"condition:{condition_id}"
    plant_ids = g["_condition_plants"].get(condition_id, [])

    included: set[str] = {cond_node_id}
    for pid in plant_ids:
        included.add(f"plant:{pid}")

    # pull in compounds of those plants
    for edge in g["edges"]:
        if edge["source"] in included and edge["type"] == "CONTAINS":
            included.add(edge["target"])

    node_map = {n["id"]: n for n in g["nodes"]}
    sub_nodes = [node_map[v] for v in included if v in node_map]
    sub_edges = [
        e for e in g["edges"]
        if e["source"] in included and e["target"] in included
    ]
    return {"nodes": sub_nodes, "edges": sub_edges}


def search_graph(query: str) -> dict:
    """Return nodes whose labels contain the query string (case-insensitive)."""
    g = load_graph()
    q = query.lower()
    matched_ids: set[str] = set()
    for node in g["nodes"]:
        if q in node["label"].lower():
            matched_ids.add(node["id"])
        if node.get("local_name") and q in node["local_name"].lower():
            matched_ids.add(node["id"])

    # include 1-hop neighbours
    neighbors: set[str] = set()
    for edge in g["edges"]:
        if edge["source"] in matched_ids:
            neighbors.add(edge["target"])
        if edge["target"] in matched_ids:
            neighbors.add(edge["source"])

    included = matched_ids | neighbors
    node_map = {n["id"]: n for n in g["nodes"]}
    sub_nodes = [node_map[v] for v in included if v in node_map]
    sub_edges = [
        e for e in g["edges"]
        if e["source"] in included and e["target"] in included
    ]
    return {"nodes": sub_nodes, "edges": sub_edges}


def get_graph_stats() -> dict:
    g = load_graph()
    by_type: dict[str, int] = defaultdict(int)
    for n in g["nodes"]:
        by_type[n["type"]] += 1
    edge_types: dict[str, int] = defaultdict(int)
    for e in g["edges"]:
        edge_types[e["type"]] += 1
    return {
        "total_nodes": len(g["nodes"]),
        "total_edges": len(g["edges"]),
        "nodes_by_type": dict(by_type),
        "edges_by_type": dict(edge_types),
    }


if __name__ == "__main__":
    g = build_graph()
    print(json.dumps(get_graph_stats(), indent=2))
