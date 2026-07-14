"""Shared dependencies: db handle, current user resolver."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "ulfn-dev-secret-change-me")
JWT_ALG = "HS256"

_client = AsyncIOMotorClient(MONGO_URL)
db = _client[DB_NAME]


def make_jwt(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + 60 * 60 * 24 * 7,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None


async def _load_user(user_id: str) -> Optional[dict]:
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


async def get_current_user_optional(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> Optional[dict]:
    """Return user dict or None. Supports session_token cookie (Emergent OAuth) and Bearer JWT."""
    # 1) Emergent OAuth session cookie
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at >= datetime.now(timezone.utc):
                user = await _load_user(session["user_id"])
                if user:
                    return user

    # 2) Bearer JWT (email/password auth)
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        payload = decode_jwt(token)
        if payload:
            return await _load_user(payload["sub"])

    return None


async def get_current_user(
    user: Optional[dict] = Depends(get_current_user_optional),
) -> dict:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: role not permitted")
        return user

    return _dep


async def audit_log(actor_id: str, action: str, target: str = "", meta: Optional[dict] = None):
    from uuid import uuid4

    doc = {
        "log_id": f"log_{uuid4().hex[:12]}",
        "actor_id": actor_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.audit_logs.insert_one(doc)
