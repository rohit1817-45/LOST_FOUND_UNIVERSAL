"""Auth router (Supabase edition): frontend does sign-in via Supabase JS.
Backend only exposes /me and /profile. No password logic here.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from deps import audit_log, get_current_user, get_current_user_optional, sb
from models import ProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(user: Optional[dict] = Depends(get_current_user_optional)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.patch("/me")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        return user
    sb.table("profiles").update(updates).eq("user_id", user["user_id"]).execute()
    await audit_log(user["user_id"], "profile.update", user["user_id"], updates)
    fresh = sb.table("profiles").select("*").eq("user_id", user["user_id"]).limit(1).execute()
    return (fresh.data or [user])[0]
