"""
OmaniEthnoDBKG – FastAPI backend
"""

import sqlite3
import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from graph import (
    load_graph,
    get_plant_neighborhood,
    get_condition_subgraph,
    search_graph,
    get_graph_stats,
    build_graph,
    GRAPH_PATH,
    DB_PATH,
)
from chatbot import chat as rag_chat, chat_with_debug as rag_chat_debug

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not GRAPH_PATH.exists():
        build_graph()
    yield


app = FastAPI(
    title="OmaniEthnoDBKG API",
    description="Oman's Ethnomedicinal Plant Knowledge Graph — REST API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con



# ---------------------------------------------------------------------------
# Plants
# ---------------------------------------------------------------------------

@app.get("/api/plants")
def list_plants(
    search: Optional[str] = Query(None, description="Search by name, local name, family"),
    family: Optional[str] = Query(None),
    condition: Optional[str] = Query(None, description="Filter by condition treated"),
    compound: Optional[str] = Query(None, description="Filter by compound"),
    skip: int = 0,
    limit: int = 50,
):
    con = db()
    cur = con.cursor()

    base = """
        SELECT DISTINCT p.id, p.family, p.scientific_name, p.local_name,
               p.part_used, p.traditional_use, p.source, p.image_url
        FROM plants p
    """
    joins, wheres, params = [], [], []

    if condition:
        joins.append(
            "JOIN plant_conditions pc_f ON pc_f.plant_id = p.id "
            "JOIN conditions cond_f ON cond_f.id = pc_f.condition_id"
        )
        wheres.append("LOWER(cond_f.name) LIKE ?")
        params.append(f"%{condition.lower()}%")

    if compound:
        joins.append(
            "JOIN plant_compounds pcomp_f ON pcomp_f.plant_id = p.id "
            "JOIN compounds comp_f ON comp_f.id = pcomp_f.compound_id"
        )
        wheres.append("LOWER(comp_f.name) LIKE ?")
        params.append(f"%{compound.lower()}%")

    if family:
        wheres.append("LOWER(p.family) LIKE ?")
        params.append(f"%{family.lower()}%")

    if search:
        wheres.append(
            "(LOWER(p.scientific_name) LIKE ? OR LOWER(p.local_name) LIKE ? OR LOWER(p.family) LIKE ?)"
        )
        s = f"%{search.lower()}%"
        params.extend([s, s, s])

    sql = base
    if joins:
        sql += " " + " ".join(joins)
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " ORDER BY p.scientific_name LIMIT ? OFFSET ?"
    params.extend([limit, skip])

    cur.execute(sql, params)
    rows = cur.fetchall()

    results = []
    for r in rows:
        pid = r["id"]

        cur.execute(
            "SELECT c.name FROM conditions c "
            "JOIN plant_conditions pc ON pc.condition_id=c.id WHERE pc.plant_id=?",
            (pid,),
        )
        conditions = [x["name"] for x in cur.fetchall()]

        cur.execute(
            "SELECT comp.name, comp.imppat_id FROM compounds comp "
            "JOIN plant_compounds pc ON pc.compound_id=comp.id WHERE pc.plant_id=?",
            (pid,),
        )
        compounds = [{"name": x["name"], "imppat_id": x["imppat_id"]} for x in cur.fetchall()]

        results.append({
            "id": pid,
            "family": r["family"],
            "scientific_name": r["scientific_name"],
            "local_name": r["local_name"],
            "part_used": r["part_used"],
            "traditional_use": r["traditional_use"],
            "source": r["source"],
            "image_url": r["image_url"],
            "conditions": conditions,
            "compounds": compounds,
        })

    # total count
    count_sql = "SELECT COUNT(DISTINCT p.id) FROM plants p"
    if joins:
        count_sql += " " + " ".join(joins)
    if wheres:
        count_sql += " WHERE " + " AND ".join(wheres)
    cur.execute(count_sql, params[:-2])
    total = cur.fetchone()[0]

    con.close()
    return {"total": total, "skip": skip, "limit": limit, "data": results}


@app.get("/api/plants/{plant_id}")
def get_plant(plant_id: int):
    con = db()
    cur = con.cursor()

    cur.execute(
        "SELECT id, family, scientific_name, local_name, part_used, traditional_use, source, image_url "
        "FROM plants WHERE id=?",
        (plant_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Plant not found")

    cur.execute(
        "SELECT c.name FROM conditions c "
        "JOIN plant_conditions pc ON pc.condition_id=c.id WHERE pc.plant_id=?",
        (plant_id,),
    )
    conditions = [x["name"] for x in cur.fetchall()]

    cur.execute(
        "SELECT comp.name, comp.imppat_id FROM compounds comp "
        "JOIN plant_compounds pc ON pc.compound_id=comp.id WHERE pc.plant_id=?",
        (plant_id,),
    )
    compounds = [{"name": x["name"], "imppat_id": x["imppat_id"]} for x in cur.fetchall()]

    # related plants (share condition)
    cur.execute(
        "SELECT DISTINCT p2.id, p2.scientific_name, p2.local_name "
        "FROM plants p2 "
        "JOIN plant_conditions pc2 ON pc2.plant_id=p2.id "
        "WHERE pc2.condition_id IN (SELECT condition_id FROM plant_conditions WHERE plant_id=?) "
        "AND p2.id != ? LIMIT 8",
        (plant_id, plant_id),
    )
    related = [{"id": r["id"], "scientific_name": r["scientific_name"], "local_name": r["local_name"]} for r in cur.fetchall()]

    con.close()
    return {
        "id": row["id"],
        "family": row["family"],
        "scientific_name": row["scientific_name"],
        "local_name": row["local_name"],
        "part_used": row["part_used"],
        "traditional_use": row["traditional_use"],
        "source": row["source"],
        "image_url": row["image_url"],
        "conditions": conditions,
        "compounds": compounds,
        "related_plants": related,
    }


# ---------------------------------------------------------------------------
# Conditions
# ---------------------------------------------------------------------------

@app.get("/api/conditions")
def list_conditions():
    con = db()
    cur = con.cursor()
    cur.execute(
        "SELECT c.id, c.name, COUNT(pc.plant_id) as plant_count "
        "FROM conditions c LEFT JOIN plant_conditions pc ON pc.condition_id=c.id "
        "GROUP BY c.id ORDER BY plant_count DESC"
    )
    rows = cur.fetchall()
    con.close()
    return [{"id": r["id"], "name": r["name"], "plant_count": r["plant_count"]} for r in rows]


# ---------------------------------------------------------------------------
# Compounds
# ---------------------------------------------------------------------------

@app.get("/api/compounds")
def list_compounds(
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
):
    con = db()
    cur = con.cursor()
    if search:
        cur.execute(
            "SELECT id, name, imppat_id FROM compounds WHERE LOWER(name) LIKE ? "
            "ORDER BY name LIMIT ? OFFSET ?",
            (f"%{search.lower()}%", limit, skip),
        )
    else:
        cur.execute(
            "SELECT id, name, imppat_id FROM compounds ORDER BY name LIMIT ? OFFSET ?",
            (limit, skip),
        )
    rows = cur.fetchall()
    con.close()
    return [{"id": r["id"], "name": r["name"], "imppat_id": r["imppat_id"]} for r in rows]


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

@app.get("/api/graph/stats")
def graph_stats():
    return get_graph_stats()


@app.get("/api/graph/plant/{plant_id}")
def plant_graph(plant_id: int, depth: int = Query(2, ge=1, le=3)):
    return get_plant_neighborhood(plant_id, depth)


@app.get("/api/graph/condition/{condition_id}")
def condition_graph(condition_id: int):
    return get_condition_subgraph(condition_id)


@app.get("/api/graph/search")
def graph_search(q: str = Query(..., min_length=1)):
    return search_graph(q)


@app.get("/api/graph/full")
def full_graph(
    types: Optional[str] = Query(None, description="Comma-separated node types to include: Plant,Condition,Compound,Family")
):
    """Return the full graph, optionally filtered by node type."""
    g = load_graph()
    if types:
        allowed = {t.strip() for t in types.split(",")}
        included_ids = {n["id"] for n in g["nodes"] if n["type"] in allowed}
        nodes = [n for n in g["nodes"] if n["id"] in included_ids]
        edges = [e for e in g["edges"] if e["source"] in included_ids and e["target"] in included_ids]
        return {"nodes": nodes, "edges": edges}
    # Return a compact version (omit internal index keys)
    return {
        "nodes": g["nodes"],
        "edges": g["edges"],
    }


# ---------------------------------------------------------------------------
# Stats / overview
# ---------------------------------------------------------------------------

@app.get("/api/stats")
def overview_stats():
    con = db()
    cur = con.cursor()
    cur.execute("SELECT COUNT(*) FROM plants"); plant_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM compounds"); compound_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM conditions"); condition_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT family) FROM plants"); family_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM plant_conditions"); pc_links = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM plant_compounds"); comp_links = cur.fetchone()[0]
    # top conditions
    cur.execute(
        "SELECT c.name, COUNT(pc.plant_id) cnt FROM conditions c "
        "JOIN plant_conditions pc ON pc.condition_id=c.id "
        "GROUP BY c.id ORDER BY cnt DESC LIMIT 10"
    )
    top_conditions = [{"name": r["name"], "count": r["cnt"]} for r in cur.fetchall()]
    # top families
    cur.execute(
        "SELECT family, COUNT(*) cnt FROM plants WHERE family IS NOT NULL GROUP BY family ORDER BY cnt DESC LIMIT 10"
    )
    top_families = [{"name": r["family"], "count": r["cnt"]} for r in cur.fetchall()]
    con.close()
    return {
        "plants": plant_count,
        "compounds": compound_count,
        "conditions": condition_count,
        "families": family_count,
        "plant_condition_links": pc_links,
        "plant_compound_links": comp_links,
        "top_conditions": top_conditions,
        "top_families": top_families,
    }


# ---------------------------------------------------------------------------
# Chatbot
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    try:
        reply = rag_chat(req.message, req.history if req.history else None)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/debug")
def chat_debug_endpoint(req: ChatRequest):
    """Returns the LLM reply plus full retrieval metadata for evaluation."""
    try:
        return rag_chat_debug(req.message, req.history if req.history else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        timeout_keep_alive=300,
    )
