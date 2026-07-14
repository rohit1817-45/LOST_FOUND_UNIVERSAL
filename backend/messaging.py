"""Messaging, notifications, saved searches, bookmarks (Supabase edition)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException

from deps import get_current_user, sb
from models import MessageInput, SavedSearchInput

router = APIRouter(tags=["messaging-and-more"])


# ------- Messaging -------

@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    # participants is uuid[]; use contains on array
    res = sb.table("conversations").select("*").contains("participants", [user["user_id"]]).order("updated_at", desc=True).limit(200).execute()
    out = []
    for c in res.data or []:
        last_res = sb.table("messages").select("*").eq("conversation_id", c["conversation_id"]).order("created_at", desc=True).limit(1).execute()
        last = (last_res.data or [None])[0]
        others = [p for p in c["participants"] if p != user["user_id"]]
        other_user = None
        if others:
            o = sb.table("profiles").select("*").eq("user_id", others[0]).limit(1).execute()
            other_user = (o.data or [None])[0]
        out.append({**c, "last": last, "other": other_user})
    return {"items": out}


@router.post("/messages")
async def send_message(payload: MessageInput, user: dict = Depends(get_current_user)):
    conv_id = payload.conversation_id
    now = datetime.now(timezone.utc).isoformat()
    if not conv_id:
        if not payload.to_user_id:
            raise HTTPException(status_code=400, detail="to_user_id required")
        participants = sorted([user["user_id"], payload.to_user_id])
        # find existing conversation between same participants + case_id
        existing_res = sb.table("conversations").select("*").contains("participants", participants).limit(50).execute()
        existing = None
        for e in existing_res.data or []:
            if sorted(e["participants"]) == participants and (e.get("case_id") or None) == (payload.case_id or None):
                existing = e; break
        if existing:
            conv_id = existing["conversation_id"]
        else:
            conv_id = f"conv_{uuid4().hex[:10]}"
            sb.table("conversations").insert({
                "conversation_id": conv_id,
                "participants": participants,
                "case_id": payload.case_id,
            }).execute()

    msg = {
        "message_id": f"msg_{uuid4().hex[:10]}",
        "conversation_id": conv_id,
        "from_user_id": user["user_id"],
        "from_name": user.get("name"),
        "text": payload.text,
        "attachment": payload.attachment,
        "shared_location": payload.shared_location.model_dump() if payload.shared_location else None,
        "created_at": now,
    }
    sb.table("messages").insert(msg).execute()
    sb.table("conversations").update({"updated_at": now}).eq("conversation_id", conv_id).execute()

    # notify other participants
    conv_res = sb.table("conversations").select("*").eq("conversation_id", conv_id).limit(1).execute()
    conv = conv_res.data[0] if conv_res.data else None
    if conv:
        for p in conv["participants"]:
            if p != user["user_id"]:
                sb.table("notifications").insert({
                    "notif_id": f"n_{uuid4().hex[:10]}",
                    "user_id": p,
                    "type": "message",
                    "title": f"New message from {user.get('name','')}",
                    "body": payload.text[:120],
                    "case_id": payload.case_id,
                    "conversation_id": conv_id,
                }).execute()
    return {"message": msg, "conversation_id": conv_id}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    conv_res = sb.table("conversations").select("*").eq("conversation_id", conversation_id).limit(1).execute()
    if not conv_res.data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = conv_res.data[0]
    if user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    msgs = sb.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).limit(500).execute()
    return {"conversation": conv, "messages": msgs.data or []}


# ------- Notifications -------

@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    res = sb.table("notifications").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(100).execute()
    items = res.data or []
    unread = sum(1 for i in items if not i.get("read_at"))
    return {"items": items, "unread": unread}


@router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    sb.table("notifications").update({"read_at": now}).eq("user_id", user["user_id"]).is_("read_at", "null").execute()
    return {"ok": True}


@router.post("/notifications/{notif_id}/read")
async def read_one(notif_id: str, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    sb.table("notifications").update({"read_at": now}).eq("notif_id", notif_id).eq("user_id", user["user_id"]).execute()
    return {"ok": True}


# ------- Saved Searches -------

@router.get("/saved-searches")
async def list_saved(user: dict = Depends(get_current_user)):
    res = sb.table("saved_searches").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).limit(100).execute()
    return {"items": res.data or []}


@router.post("/saved-searches")
async def create_saved(payload: SavedSearchInput, user: dict = Depends(get_current_user)):
    doc = {
        "search_id": f"s_{uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "name": payload.name,
        "filters": payload.filters,
        "center": payload.center.model_dump() if payload.center else None,
        "radius_km": payload.radius_km,
    }
    sb.table("saved_searches").insert(doc).execute()
    return {"item": doc}


@router.delete("/saved-searches/{search_id}")
async def delete_saved(search_id: str, user: dict = Depends(get_current_user)):
    sb.table("saved_searches").delete().eq("search_id", search_id).eq("user_id", user["user_id"]).execute()
    return {"ok": True}


# ------- Bookmarks -------

@router.post("/bookmarks/{case_id}")
async def bookmark(case_id: str, user: dict = Depends(get_current_user)):
    sb.table("bookmarks").upsert({"user_id": user["user_id"], "case_id": case_id}).execute()
    return {"ok": True}


@router.delete("/bookmarks/{case_id}")
async def unbookmark(case_id: str, user: dict = Depends(get_current_user)):
    sb.table("bookmarks").delete().eq("user_id", user["user_id"]).eq("case_id", case_id).execute()
    return {"ok": True}


@router.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_current_user)):
    bm = sb.table("bookmarks").select("case_id").eq("user_id", user["user_id"]).execute()
    ids = [b["case_id"] for b in (bm.data or [])]
    if not ids:
        return {"items": []}
    cs = sb.table("cases").select("*").in_("case_id", ids).execute()
    return {"items": cs.data or []}
