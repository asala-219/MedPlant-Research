"""
GraphRAG Chatbot — Gemini API backend.

Uses the GraphRAGPipeline for multi-strategy, graph-aware retrieval
and Google Gemini (cloud) for answer generation. No local Ollama required.
"""

import os
import sqlite3

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from graph import DB_PATH
from graph_rag import GraphRAGPipeline, RetrievalOutput

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Singleton pipeline instance (caches graph + indexes on first call)
_pipeline = GraphRAGPipeline()
_client: genai.Client | None = None


# ─────────────────────────────────────────────────────────────────────────────
# System prompt — chain-of-retrieval with citation instructions
# ─────────────────────────────────────────────────────────────────────────────

def _dataset_counts() -> tuple[int, int, int]:
    con = sqlite3.connect(DB_PATH)
    try:
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) FROM plants")
        plants = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM compounds")
        compounds = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM conditions")
        conditions = cur.fetchone()[0]
        return int(plants), int(compounds), int(conditions)
    finally:
        con.close()


def build_system_prompt() -> str:
    plant_count, compound_count, condition_count = _dataset_counts()
    return f"""\
You are **OmaniEthno Assistant**, a bilingual (Arabic/English) expert on Omani \
traditional ethnomedicinal plants. You are powered by a knowledge graph of \
{plant_count} plants, {compound_count} phytochemical compounds, and {condition_count} medical conditions drawn from \
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


SYSTEM_PROMPT = build_system_prompt()


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
# Gemini client
# ─────────────────────────────────────────────────────────────────────────────


def _get_client() -> genai.Client:
    global _client
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to .env or export it. "
            "Get a free key at https://aistudio.google.com/apikey"
        )
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _gemini_chat(messages: list[dict]) -> str:
    """Send messages to Gemini and return the assistant reply."""
    system = build_system_prompt()
    if messages and messages[0].get("role") == "system":
        system = messages[0]["content"]

    history: list[types.Content] = []
    for turn in messages[1:-1]:
        role = turn.get("role")
        content = turn.get("content", "")
        if role == "user":
            history.append(types.Content(role="user", parts=[types.Part(text=content)]))
        elif role == "assistant":
            history.append(types.Content(role="model", parts=[types.Part(text=content)]))

    final_user = messages[-1]["content"]

    client = _get_client()
    chat = client.chats.create(
        model=GEMINI_MODEL,
        config=types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=1024,
            system_instruction=system,
        ),
        history=history,
    )

    try:
        response = chat.send_message(final_user)
    except genai_errors.ClientError as exc:
        if exc.code == 429:
            raise RuntimeError(
                "Gemini API quota exceeded. Wait a minute and retry, or check "
                "https://ai.google.dev/gemini-api/docs/rate-limits"
            ) from exc
        raise RuntimeError(f"Gemini request failed: {exc}") from exc
    except genai_errors.ServerError as exc:
        if exc.code == 503:
            raise RuntimeError(
                "Gemini model is temporarily unavailable (high demand). "
                "Please retry in a moment."
            ) from exc
        raise RuntimeError(f"Gemini request failed: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Gemini request failed: {exc}") from exc

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")
    return response.text


# ─────────────────────────────────────────────────────────────────────────────
# Chat function
# ─────────────────────────────────────────────────────────────────────────────


def chat(
    message: str,
    history: list[dict] | None = None,
) -> str:
    """Run the full GraphRAG pipeline and generate a response via Gemini."""

    # Stage 1-4: Retrieval pipeline (top_k=8 to keep context manageable)
    result: RetrievalOutput = _pipeline.retrieve(message, top_k=8)

    # Build the LLM messages
    messages = [{"role": "system", "content": build_system_prompt()}]

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

    return _gemini_chat(messages)


def chat_with_debug(
    message: str,
    history: list[dict] | None = None,
) -> dict:
    """Same as chat() but also returns retrieval metadata for evaluation."""

    result: RetrievalOutput = _pipeline.retrieve(message)

    messages = [{"role": "system", "content": build_system_prompt()}]
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

    reply = _gemini_chat(messages)

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
