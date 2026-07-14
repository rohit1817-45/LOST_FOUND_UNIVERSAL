"""Shared dependencies: Supabase client + current user resolver.

Backend uses SERVICE_ROLE_KEY to talk to Supabase (bypasses RLS on purpose).
All permission checks happen here in FastAPI via require_roles().

Auth flow: frontend uses Supabase Auth JS to sign in; it sends the Supabase
access_token as Bearer to our /api/*. We verify via supabase.auth.get_user(jwt).
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Admin client: bypasses RLS. Use only from backend.
sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Anon client for verifying user tokens (get_user(jwt))
sb_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Simple in-memory token->profile cache to avoid hitting Supabase per request.
_token_cache: dict[str, tuple[float, dict]] = {}
_CACHE_TTL_S = 45


async def _load_profile(user_id: str) -> Optional[dict]:
    res = sb.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
    rows = res.data or []
    return rows[0] if rows else None


async def get_current_user_optional(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None

    # cache lookup
    cached = _token_cache.get(token)
    now = time.time()
    if cached and cached[0] > now:
        return cached[1]

    try:
        u = sb_anon.auth.get_user(token)
    except Exception:
        return None
    if not u or not u.user:
        return None
    profile = await _load_profile(u.user.id)
    if not profile:
        # profile trigger should create it, but fall back to constructing a minimal one
        profile = {
            "user_id": u.user.id,
            "email": u.user.email,
            "name": (u.user.user_metadata or {}).get("name") or (u.user.email or "").split("@")[0],
            "role": "user",
            "verified": False,
            "picture": (u.user.user_metadata or {}).get("picture"),
        }
    _token_cache[token] = (now + _CACHE_TTL_S, profile)
    return profile


async def get_current_user(user: Optional[dict] = Depends(get_current_user_optional)) -> dict:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if user.get("suspended"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return user


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role")
        if role not in roles and role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: role not permitted")
        return user
    return _dep


async def audit_log(actor_id: Optional[str], action: str, target: str = "", meta: Optional[dict] = None):
    from uuid import uuid4
    doc = {
        "log_id": f"log_{uuid4().hex[:12]}",
        "actor_id": actor_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        sb.table("audit_logs").insert(doc).execute()
    except Exception:
        pass


def bust_token_cache(token: Optional[str] = None):
    if token:
        _token_cache.pop(token, None)
    else:
        _token_cache.clear()
