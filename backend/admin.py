"""
Admin API helpers — schema introspection, row CRUD, and column management.

Protected by a simple session token (ADMIN_PASSWORD in .env). Intended for
local / trusted-operator use, not public internet exposure.
"""

from __future__ import annotations

import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from typing import Any

from fastapi import Depends, Header, HTTPException

from graph import DB_PATH, build_graph

BACKEND_DIR = Path(__file__).parent
UPLOADS_DIR = BACKEND_DIR / "uploads"
PLANT_IMAGES_DIR = UPLOADS_DIR / "plants"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def ensure_upload_dirs() -> None:
    PLANT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
SESSION_TTL = 60 * 60 * 12  # 12 hours
_sessions: dict[str, float] = {}

_IDENT = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")

MANAGED_TABLES: dict[str, dict[str, Any]] = {
    "plants": {
        "label": "Plants",
        "pk": ["id"],
        "auto_pk": "id",
        "required": ["scientific_name"],
        "allow_add_column": True,
    },
    "compounds": {
        "label": "Compounds",
        "pk": ["id"],
        "auto_pk": "id",
        "required": ["name"],
        "allow_add_column": True,
    },
    "conditions": {
        "label": "Conditions",
        "pk": ["id"],
        "auto_pk": "id",
        "required": ["name"],
        "allow_add_column": True,
    },
    "plant_compounds": {
        "label": "Plant ↔ Compound links",
        "pk": ["plant_id", "compound_id"],
        "auto_pk": None,
        "required": ["plant_id", "compound_id"],
        "allow_add_column": True,
    },
    "plant_conditions": {
        "label": "Plant ↔ Condition links",
        "pk": ["plant_id", "condition_id"],
        "auto_pk": None,
        "required": ["plant_id", "condition_id"],
        "allow_add_column": False,
    },
}

SQLITE_TYPES = {"TEXT", "INTEGER", "REAL", "BLOB"}


def admin_enabled() -> bool:
    return bool(ADMIN_PASSWORD)


def login(password: str) -> str | None:
    if not admin_enabled():
        return None
    if password != ADMIN_PASSWORD:
        return None
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time() + SESSION_TTL
    return token


def logout(token: str) -> None:
    _sessions.pop(token, None)


def _verify_token(token: str | None) -> bool:
    if not token:
        return False
    exp = _sessions.get(token)
    if not exp or time.time() > exp:
        _sessions.pop(token, None)
        return False
    return True


def require_admin(authorization: str | None = Header(None)) -> str:
    if not admin_enabled():
        raise HTTPException(status_code=503, detail="Admin panel is disabled (set ADMIN_PASSWORD)")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")
    token = authorization[7:].strip()
    if not _verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")
    return token


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _connect() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _safe_ident(name: str) -> str:
    if not _IDENT.match(name):
        raise HTTPException(status_code=400, detail=f"Invalid identifier: {name}")
    return name


def _table_meta(name: str) -> dict[str, Any]:
    if name not in MANAGED_TABLES:
        raise HTTPException(status_code=404, detail=f"Table not managed: {name}")
    return MANAGED_TABLES[name]


def _column_info(table: str) -> list[dict[str, Any]]:
    _table_meta(table)
    con = _connect()
    cur = con.cursor()
    cur.execute(f"PRAGMA table_info({_safe_ident(table)})")
    cols = [
        {
            "name": r["name"],
            "type": r["type"],
            "notnull": bool(r["notnull"]),
            "pk": bool(r["pk"]),
            "default": r["dflt_value"],
        }
        for r in cur.fetchall()
    ]
    con.close()
    return cols


def list_tables() -> list[dict[str, Any]]:
    out = []
    for name, meta in MANAGED_TABLES.items():
        cols = _column_info(name)
        con = _connect()
        cur = con.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {_safe_ident(name)}")
        count = cur.fetchone()[0]
        con.close()
        out.append({
            "name": name,
            "label": meta["label"],
            "row_count": count,
            "columns": cols,
            "pk": meta["pk"],
            "auto_pk": meta.get("auto_pk"),
            "required": meta.get("required", []),
            "allow_add_column": meta["allow_add_column"],
        })
    return out


def list_rows(table: str, skip: int = 0, limit: int = 50, search: str | None = None) -> dict:
    meta = _table_meta(table)
    cols = _column_info(table)
    col_names = [c["name"] for c in cols]
    safe_table = _safe_ident(table)

    wheres: list[str] = []
    params: list[Any] = []
    if search:
        clauses = [f"CAST({_safe_ident(c)} AS TEXT) LIKE ?" for c in col_names]
        wheres.append("(" + " OR ".join(clauses) + ")")
        params.extend([f"%{search}%"] * len(col_names))

    where_sql = (" WHERE " + " AND ".join(wheres)) if wheres else ""
    order = ", ".join(_safe_ident(c) for c in meta["pk"])

    con = _connect()
    cur = con.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {safe_table}{where_sql}", params)
    total = cur.fetchone()[0]

    cur.execute(
        f"SELECT * FROM {safe_table}{where_sql} ORDER BY {order} LIMIT ? OFFSET ?",
        [*params, limit, skip],
    )
    rows = [dict(r) for r in cur.fetchall()]
    con.close()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "columns": cols,
        "rows": rows,
        "pk": meta["pk"],
        "auto_pk": meta.get("auto_pk"),
    }


def _normalize_value(value: Any) -> Any:
    if value == "":
        return None
    return value


def insert_row(table: str, data: dict[str, Any]) -> dict:
    meta = _table_meta(table)
    cols = _column_info(table)
    col_names = {c["name"] for c in cols}

    payload = {k: _normalize_value(v) for k, v in data.items() if k in col_names}
    if meta["auto_pk"]:
        payload.pop(meta["auto_pk"], None)

    missing = [f for f in meta["required"] if not payload.get(f) and payload.get(f) != 0]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    keys = list(payload.keys())
    placeholders = ", ".join("?" * len(keys))
    col_sql = ", ".join(_safe_ident(k) for k in keys)

    con = _connect()
    cur = con.cursor()
    try:
        cur.execute(
            f"INSERT INTO {_safe_ident(table)} ({col_sql}) VALUES ({placeholders})",
            [payload[k] for k in keys],
        )
        con.commit()
        if meta["auto_pk"]:
            new_id = cur.lastrowid
            cur.execute(
                f"SELECT * FROM {_safe_ident(table)} WHERE {_safe_ident(meta['auto_pk'])}=?",
                (new_id,),
            )
            row = dict(cur.fetchone())
        else:
            pk_vals = [payload[pk] for pk in meta["pk"]]
            pk_where = " AND ".join(f"{_safe_ident(pk)}=?" for pk in meta["pk"])
            cur.execute(f"SELECT * FROM {_safe_ident(table)} WHERE {pk_where}", pk_vals)
            row = dict(cur.fetchone())
    except sqlite3.IntegrityError as e:
        con.close()
        raise HTTPException(status_code=409, detail=str(e))
    con.close()
    build_graph()
    return row


def update_row(table: str, pk: dict[str, Any], data: dict[str, Any]) -> dict:
    meta = _table_meta(table)
    cols = _column_info(table)
    col_names = {c["name"] for c in cols}
    pk_cols = set(meta["pk"])

    if not all(pk.get(k) is not None for k in meta["pk"]):
        raise HTTPException(status_code=400, detail=f"Primary key fields required: {meta['pk']}")

    updates = {
        k: _normalize_value(v)
        for k, v in data.items()
        if k in col_names and k not in pk_cols and k != meta.get("auto_pk")
    }
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_sql = ", ".join(f"{_safe_ident(k)}=?" for k in updates)
    where_sql = " AND ".join(f"{_safe_ident(k)}=?" for k in meta["pk"])

    con = _connect()
    cur = con.cursor()
    try:
        cur.execute(
            f"UPDATE {_safe_ident(table)} SET {set_sql} WHERE {where_sql}",
            [*updates.values(), *[pk[k] for k in meta["pk"]]],
        )
        if cur.rowcount == 0:
            con.close()
            raise HTTPException(status_code=404, detail="Row not found")
        con.commit()
        cur.execute(
            f"SELECT * FROM {_safe_ident(table)} WHERE {where_sql}",
            [pk[k] for k in meta["pk"]],
        )
        row = dict(cur.fetchone())
    except sqlite3.IntegrityError as e:
        con.close()
        raise HTTPException(status_code=409, detail=str(e))
    con.close()
    build_graph()
    return row


def delete_row(table: str, pk: dict[str, Any]) -> dict:
    meta = _table_meta(table)
    if not all(pk.get(k) is not None for k in meta["pk"]):
        raise HTTPException(status_code=400, detail=f"Primary key fields required: {meta['pk']}")

    where_sql = " AND ".join(f"{_safe_ident(k)}=?" for k in meta["pk"])
    con = _connect()
    cur = con.cursor()
    cur.execute(
        f"DELETE FROM {_safe_ident(table)} WHERE {where_sql}",
        [pk[k] for k in meta["pk"]],
    )
    if cur.rowcount == 0:
        con.close()
        raise HTTPException(status_code=404, detail="Row not found")
    con.commit()
    con.close()
    build_graph()
    return {"deleted": True, "pk": pk}


def add_column(table: str, name: str, col_type: str = "TEXT", default: str | None = None) -> dict:
    meta = _table_meta(table)
    if not meta["allow_add_column"]:
        raise HTTPException(status_code=400, detail=f"Adding columns is not allowed on {table}")

    safe_name = _safe_ident(name)
    upper_type = col_type.upper()
    if upper_type not in SQLITE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported type. Use one of: {', '.join(SQLITE_TYPES)}")

    existing = {c["name"] for c in _column_info(table)}
    if safe_name in existing:
        raise HTTPException(status_code=409, detail=f"Column already exists: {safe_name}")

    sql = f"ALTER TABLE {_safe_ident(table)} ADD COLUMN {safe_name} {upper_type}"
    if default is not None:
        sql += f" DEFAULT '{default.replace(chr(39), chr(39)+chr(39))}'"

    con = _connect()
    cur = con.cursor()
    try:
        cur.execute(sql)
        con.commit()
    except sqlite3.OperationalError as e:
        con.close()
        raise HTTPException(status_code=400, detail=str(e))
    con.close()
    return {"table": table, "column": safe_name, "type": upper_type, "columns": _column_info(table)}


def rebuild_graph() -> dict:
    g = build_graph()
    return {
        "nodes": len(g["nodes"]),
        "edges": len(g["edges"]),
        "message": "Knowledge graph rebuilt",
    }


def _plant_exists(plant_id: int) -> bool:
    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT 1 FROM plants WHERE id=?", (plant_id,))
    ok = cur.fetchone() is not None
    con.close()
    return ok


def _remove_local_upload(url: str | None) -> None:
    """Delete a previously stored upload file when it lives under /uploads/."""
    if not url or not url.startswith("/uploads/"):
        return
    path = UPLOADS_DIR / url.removeprefix("/uploads/").replace("/", os.sep)
    if path.is_file():
        path.unlink()


def upload_plant_image(
    plant_id: int,
    data: bytes,
    content_type: str,
) -> dict:
    ensure_upload_dirs()
    if not _plant_exists(plant_id):
        raise HTTPException(status_code=404, detail="Plant not found")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 5 MB or smaller")

    ext = ALLOWED_IMAGE_TYPES.get((content_type or "").lower())
    if not ext:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
        )

    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT image_url FROM plants WHERE id=?", (plant_id,))
    row = cur.fetchone()
    old_url = row["image_url"] if row else None
    con.close()

    filename = f"plant_{plant_id}{ext}"
    dest = PLANT_IMAGES_DIR / filename
    dest.write_bytes(data)

    image_url = f"/uploads/plants/{filename}"
    con = _connect()
    cur = con.cursor()
    cur.execute("UPDATE plants SET image_url=? WHERE id=?", (image_url, plant_id))
    con.commit()
    con.close()

    if old_url and old_url != image_url:
        _remove_local_upload(old_url)

    return {"plant_id": plant_id, "image_url": image_url}


def delete_plant_image(plant_id: int) -> dict:
    if not _plant_exists(plant_id):
        raise HTTPException(status_code=404, detail="Plant not found")

    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT image_url FROM plants WHERE id=?", (plant_id,))
    row = cur.fetchone()
    old_url = row["image_url"] if row else None
    cur.execute("UPDATE plants SET image_url=NULL WHERE id=?", (plant_id,))
    con.commit()
    con.close()

    _remove_local_upload(old_url)
    return {"plant_id": plant_id, "image_url": None}
