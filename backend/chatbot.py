"""
GraphRAG chatbot — Ollama (local LLM) backend.

Requires: Ollama running locally (ollama serve)
"""

import os
import re
import sqlite3
from pathlib import Path

import httpx

DB_PATH = Path(__file__).parent / "omani_ethno.db"
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")


def _db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


_STOPWORDS = {
    "what", "which", "where", "how", "why", "who", "is", "are", "was", "were",
    "the", "a", "an", "in", "on", "at", "of", "for", "to", "and", "or", "but",
    "with", "from", "by", "about", "that", "this", "do", "does", "did", "have",
    "has", "had", "can", "could", "would", "should", "plants", "plant", "oman",
    "omani", "used", "use", "treat", "treating", "treated", "tell", "me",
    "list", "give", "find", "show", "traditional",
}


def _keywords(query: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z؀-ۿ]+", query.lower())
    singles = [t for t in tokens if len(t) > 2 and t not in _STOPWORDS]
    bigrams = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens)-1)]
    return list(dict.fromkeys(bigrams + singles))


def _build_context(query: str) -> str:
    con = _db()
    cur = con.cursor()
    keywords = _keywords(query)
    seen: set[int] = set()
    plants: list = []
    plants_via_cond: list = []
    blocks: list[str] = []

    for kw in keywords:
        q = f"%{kw}%"

        cur.execute(
            "SELECT id, scientific_name, local_name, family, part_used, traditional_use FROM plants "
            "WHERE LOWER(scientific_name) LIKE ? OR LOWER(local_name) LIKE ? LIMIT 10",
            (q, q),
        )
        for row in cur.fetchall():
            if row["id"] not in seen:
                seen.add(row["id"])
                plants.append(row)

        cur.execute(
            "SELECT p.id, p.scientific_name, p.local_name, p.family, p.part_used, p.traditional_use "
            "FROM plants p "
            "JOIN plant_conditions pc ON pc.plant_id = p.id "
            "JOIN conditions c ON c.id = pc.condition_id "
            "WHERE LOWER(c.name) LIKE ? LIMIT 15",
            (q,),
        )
        for row in cur.fetchall():
            if row["id"] not in seen:
                seen.add(row["id"])
                plants_via_cond.append(row)

    all_plants = plants + plants_via_cond

    for plant in all_plants[:12]:
        pid = plant["id"]
        cur.execute(
            "SELECT c.name FROM conditions c "
            "JOIN plant_conditions pc ON pc.condition_id = c.id WHERE pc.plant_id = ?",
            (pid,),
        )
        conds = [r["name"] for r in cur.fetchall()]

        cur.execute(
            "SELECT comp.name FROM compounds comp "
            "JOIN plant_compounds pc ON pc.compound_id = comp.id WHERE pc.plant_id = ?",
            (pid,),
        )
        comps = [r["name"] for r in cur.fetchall()]

        block = (
            f"Plant: {plant['scientific_name']}"
            + (f" (Local: {plant['local_name']})" if plant["local_name"] else "")
            + f"\nFamily: {plant['family'] or 'Unknown'}"
            + f"\nPart used: {plant['part_used'] or 'Not specified'}"
            + f"\nTraditional use: {plant['traditional_use'] or 'Not documented'}"
            + (f"\nConditions treated: {', '.join(conds)}" if conds else "")
            + (f"\nPhytochemicals: {', '.join(comps[:8])}" if comps else "")
        )
        blocks.append(block)

    con.close()
    return "\n\n---\n\n".join(blocks) if blocks else ""


SYSTEM_PROMPT = """\
You are OmaniEthno Assistant, a bilingual (Arabic/English) expert on Oman's traditional \
ethnomedicinal plants. You have access to a knowledge graph of 180 plants, 437 phytochemical \
compounds, and 40 medical conditions drawn from authenticated ethnobotanical research.

Rules:
- Answer in the same language as the user's question (Arabic or English).
- Base your answers strictly on the provided context. If something is not in the context, say so.
- Cite plant names (scientific and local) in your answers.
- Never give medical prescriptions or dosage advice.
- Keep answers clear, structured, and helpful for researchers and the general public.
"""


def chat(message: str, history: list[dict] | None = None) -> str:
    context = _build_context(message)
    context_block = (
        f"\n\n<knowledge_graph_context>\n{context}\n</knowledge_graph_context>"
        if context
        else "\n\n<knowledge_graph_context>No specific entries found for this query.</knowledge_graph_context>"
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for turn in history:
            role = turn.get("role")
            content = turn.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message + context_block})

    resp = httpx.post(
        f"{OLLAMA_BASE}/api/chat",
        json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
        timeout=120.0,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]
