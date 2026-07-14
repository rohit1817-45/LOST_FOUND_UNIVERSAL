"""Auth router: register, login, /me, logout, Emergent OAuth session exchange."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

import bcrypt
import requests
from fastapi import APIRouter, Body, Depends, HTTPException, Response

from deps import audit_log, db, get_current_user, get_current_user_optional, make_jwt
from models import LoginInput, OAuthSessionInput, RegisterInput

router = APIRouter(prefix="/auth", tags=["auth"])

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _sanitize_user(u: dict) -> dict:
    out = {k: v for k, v in u.items() if k not in ("password_hash", "_id")}
    return out


@router.post("/register")
async def register(payload: RegisterInput):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name,
        "role": "user",
        "picture": None,
        "verified": False,
        "auth_provider": "password",
        "password_hash": _hash_password(payload.password),
        "created_at": now,
    }
    await db.users.insert_one(doc)
    await audit_log(user_id, "user.register", user_id)
    token = make_jwt(user_id, "user")
    return {"token": token, "user": _sanitize_user(doc)}


@router.post("/login")
async def login(payload: LoginInput):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not _check_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_jwt(user["user_id"], user.get("role", "user"))
    await audit_log(user["user_id"], "user.login", user["user_id"])
    return {"token": token, "user": _sanitize_user(user)}


@router.get("/me")
async def me(user: Optional[dict] = Depends(get_current_user_optional)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _sanitize_user(user)


@router.post("/oauth/session")
async def oauth_session(payload: OAuthSessionInput, response: Response):
    """Exchange Emergent session_id for a user + session cookie.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    try:
        r = requests.get(
            EMERGENT_SESSION_URL,
            headers={"X-Session-ID": payload.session_id},
            timeout=10,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OAuth provider error: {exc}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid OAuth session")
    data = r.json()
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    provider_id = data.get("id")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="OAuth provider returned incomplete data")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user = existing
        # update picture/name if changed
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": name, "picture": picture, "auth_provider": user.get("auth_provider", "google")}},
        )
    else:
        user_id = f"user_{uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "user",
            "verified": False,
            "auth_provider": "google",
            "provider_id": provider_id,
            "created_at": now,
        }
        await db.users.insert_one(user)

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )
    await audit_log(user["user_id"], "user.login.google", user["user_id"])
    return {"user": _sanitize_user(user)}


@router.post("/logout")
async def logout(response: Response, user: Optional[dict] = Depends(get_current_user_optional)):
    if user:
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
