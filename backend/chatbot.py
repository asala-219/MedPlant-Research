"""
GraphRAG Chatbot — Enhanced pipeline with Ollama backend.

Uses the GraphRAGPipeline for multi-strategy, graph-aware retrieval
and Ollama (local LLM) for generation.
"""

import os
from pathlib import Path

import httpx

from graph_rag import GraphRAGPipeline, RetrievalOutput

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

# Singleton pipeline instance (caches graph + indexes on first call)
_pipeline = GraphRAGPipeline()


# ─────────────────────────────────────────────────────────────────────────────
# System prompt — chain-of-retrieval with citation instructions
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are **OmaniEthno Assistant**, a bilingual (Arabic/English) expert on Oman's \
traditional ethnomedicinal plants. You are powered by a knowledge graph of \
180 plants, 437 phytochemical compounds, and 40 medical conditions drawn from \
authenticated ethnobotanical research.

## Response Protocol

1. **Answer in the same language** as the user's question (Arabic or English).
2. **Base your answers strictly on the provided knowledge-graph context.**
   - If data is present, synthesize it clearly with citations.
   - If no relevant data exists, say: "This information is not available in our knowledge graph."
3. **Cite plants** using both scientific and local names, e.g. ***Boswellia sacra*** **(Luban)**.
4. **Structure your response** using markdown:
   - Use **bold** for plant names and key terms.
   - Use bullet lists for enumerating plants or compounds.
   - Use headings (##) for multi-part answers.
5. **When graph relationships are provided**, describe cross-plant connections:
   - Shared compounds between plants treating the same condition.
   - Co-treatment patterns (multiple plants for the same condition).
   - Family-level patterns (e.g., "three Apiaceae family plants treat digestive issues").
6. **End with a confidence note**:
   - *High confidence* — multiple strong matches from the knowledge graph.
   - *Moderate confidence* — partial matches or indirect connections.
   - *Low confidence* — limited data, answer may be incomplete.
7. **Never** give medical prescriptions, dosage advice, or treatment recommendations.
   Always include a disclaimer that this is for research purposes only.
"""


# ─────────────────────────────────────────────────────────────────────────────
# User prompt template
# ─────────────────────────────────────────────────────────────────────────────

USER_TEMPLATE = """\
<query>{query}</query>

<knowledge_graph_context>
{context}
</knowledge_graph_context>

Based on the knowledge graph context above, answer the query. Follow the response protocol:
1. Provide a direct answer citing plant names (scientific + local).
2. Highlight notable graph relationships (shared compounds, co-treatment patterns).
3. State your confidence level (high/moderate/low) based on the retrieval metadata.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Chat function
# ─────────────────────────────────────────────────────────────────────────────


def chat(
    message: str,
    history: list[dict] | None = None,
) -> str:
    """Run the full GraphRAG pipeline and generate a response via Ollama."""

    # Stage 1-4: Retrieval pipeline (top_k=8 to keep context manageable for 7B)
    result: RetrievalOutput = _pipeline.retrieve(message, top_k=8)

    # Build the LLM messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include recent history (cap at 3 turns to stay within context budget)
    if history:
        for turn in history[-6:]:  # last 3 exchanges (6 messages)
            role = turn.get("role")
            content = turn.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

    # Current query with structured context
    user_msg = USER_TEMPLATE.format(
        query=message,
        context=result.assembled_context,
    )
    messages.append({"role": "user", "content": user_msg})

    # Call Ollama
    resp = httpx.post(
        f"{OLLAMA_BASE}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 1024,
            },
        },
        timeout=120.0,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def chat_with_debug(
    message: str,
    history: list[dict] | None = None,
) -> dict:
    """Same as chat() but also returns retrieval metadata for evaluation."""

    result: RetrievalOutput = _pipeline.retrieve(message)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for turn in history[-6:]:
            role = turn.get("role")
            content = turn.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

    user_msg = USER_TEMPLATE.format(
        query=message,
        context=result.assembled_context,
    )
    messages.append({"role": "user", "content": user_msg})

    resp = httpx.post(
        f"{OLLAMA_BASE}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 1024,
            },
        },
        timeout=120.0,
    )
    resp.raise_for_status()
    reply = resp.json()["message"]["content"]

    return {
        "reply": reply,
        "retrieval": {
            **result.metadata,
            "entities": [
                {
                    "label": e.label,
                    "type": e.node_type,
                    "match_method": e.match_method,
                    "match_score": round(e.match_score, 3),
                    "query_span": e.query_span,
                }
                for e in result.query_analysis.entities[:8]
            ],
            "plants_retrieved": [
                {
                    "scientific_name": p.scientific_name,
                    "local_name": p.local_name,
                    "score": round(p.score, 3),
                    "relevance": p.relevance_reason,
                }
                for p in result.plants
            ],
            "relationship_paths": result.relationship_paths[:8],
            "shared_compounds": result.shared_compounds[:5],
        },
    }
