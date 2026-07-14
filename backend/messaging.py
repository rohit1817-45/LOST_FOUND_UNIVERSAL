"""Messaging, notifications, saved searches, bookmarks routers."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException

from deps import db, get_current_user
from models import MessageInput, SavedSearchInput

router = APIRouter(tags=["messaging-and-more"])


# ------- Messaging -------

@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({"participants": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    # attach last message + other user
    out = []
    for c in convs:
        last = await db.messages.find_one({"conversation_id": c["conversation_id"]}, {"_id": 0}, sort=[("created_at", -1)])
        others = [p for p in c["participants"] if p != user["user_id"]]
        other_user = None
        if others:
            other_user = await db.users.find_one({"user_id": others[0]}, {"_id": 0, "password_hash": 0})
        out.append({**c, "last": last, "other": other_user})
    return {"items": out}


@router.post("/messages")
async def send_message(payload: MessageInput, user: dict = Depends(get_current_user)):
    conv_id = payload.conversation_id
    now = datetime.now(timezone.utc).isoformat()
    if not conv_id:
        if not payload.to_user_id:
            raise HTTPException(status_code=400, detail="to_user_id required to start a conversation")
        # find or create conversation between the two users (optionally tied to case)
        participants = sorted([user["user_id"], payload.to_user_id])
        existing = await db.conversations.find_one({"participants": participants, "case_id": payload.case_id}, {"_id": 0})
        if existing:
            conv_id = existing["conversation_id"]
        else:
            conv_id = f"conv_{uuid4().hex[:10]}"
            await db.conversations.insert_one({
                "conversation_id": conv_id,
                "participants": participants,
                "case_id": payload.case_id,
                "created_at": now,
                "updated_at": now,
            })
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
    await db.messages.insert_one(msg)
    await db.conversations.update_one({"conversation_id": conv_id}, {"$set": {"updated_at": now}})
    # notify the other participant
    conv = await db.conversations.find_one({"conversation_id": conv_id}, {"_id": 0})
    for p in conv["participants"]:
        if p != user["user_id"]:
            await db.notifications.insert_one({
                "notif_id": f"n_{uuid4().hex[:10]}",
                "user_id": p,
                "type": "message",
                "title": f"New message from {user.get('name','')}",
                "body": payload.text[:120],
                "case_id": payload.case_id,
                "conversation_id": conv_id,
                "read_at": None,
                "created_at": now,
            })
    # Remove _id before returning
    msg.pop("_id", None)
    return {"message": msg, "conversation_id": conv_id}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"conversation_id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user["user_id"] not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    msgs = await db.messages.find({"conversation_id": conversation_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"conversation": conv, "messages": msgs}


# ------- Notifications -------

@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    unread = sum(1 for i in items if not i.get("read_at"))
    return {"items": items, "unread": unread}


@router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.notifications.update_many({"user_id": user["user_id"], "read_at": None}, {"$set": {"read_at": now}})
    return {"ok": True}


@router.post("/notifications/{notif_id}/read")
async def read_one(notif_id: str, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.notifications.update_one({"notif_id": notif_id, "user_id": user["user_id"]}, {"$set": {"read_at": now}})
    return {"ok": True}


# ------- Saved Searches -------

@router.get("/saved-searches")
async def list_saved(user: dict = Depends(get_current_user)):
    items = await db.saved_searches.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}


@router.post("/saved-searches")
async def create_saved(payload: SavedSearchInput, user: dict = Depends(get_current_user)):
    doc = {
        "search_id": f"s_{uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "name": payload.name,
        "filters": payload.filters,
        "center": payload.center.model_dump() if payload.center else None,
        "radius_km": payload.radius_km,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.saved_searches.insert_one(doc)
    return {"item": doc}


@router.delete("/saved-searches/{search_id}")
async def delete_saved(search_id: str, user: dict = Depends(get_current_user)):
    await db.saved_searches.delete_one({"search_id": search_id, "user_id": user["user_id"]})
    return {"ok": True}


# ------- Bookmarks -------

@router.post("/bookmarks/{case_id}")
async def bookmark(case_id: str, user: dict = Depends(get_current_user)):
    await db.bookmarks.update_one(
        {"user_id": user["user_id"], "case_id": case_id},
        {"$set": {"user_id": user["user_id"], "case_id": case_id, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@router.delete("/bookmarks/{case_id}")
async def unbookmark(case_id: str, user: dict = Depends(get_current_user)):
    await db.bookmarks.delete_one({"user_id": user["user_id"], "case_id": case_id})
    return {"ok": True}


@router.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_current_user)):
    bookmarks = await db.bookmarks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)
    case_ids = [b["case_id"] for b in bookmarks]
    cases = await db.cases.find({"case_id": {"$in": case_ids}}, {"_id": 0}).to_list(200)
    return {"items": cases}
