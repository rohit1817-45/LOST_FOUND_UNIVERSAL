"""Cases router: create/read/update, search (with fuzzy + radius), matches, timeline."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import audit_log, db, get_current_user, get_current_user_optional, require_roles
from matching import _fuzzy_match, _haversine_km, recompute_matches, score_pair, COLOR_SYNONYMS, BREED_SYNONYMS
from models import CaseInput, CaseUpdate

router = APIRouter(prefix="/cases", tags=["cases"])


def _proj():
    return {"_id": 0}


async def _timeline(case_id: str, event: str, meta: Optional[dict] = None, actor_id: Optional[str] = None):
    await db.case_timeline.insert_one({
        "case_id": case_id,
        "event": event,
        "meta": meta or {},
        "actor_id": actor_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _notify(user_id: str, ntype: str, title: str, body: str, case_id: Optional[str] = None):
    await db.notifications.insert_one({
        "notif_id": f"n_{uuid4().hex[:10]}",
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "case_id": case_id,
        "read_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@router.post("")
async def create_case(payload: CaseInput, user: dict = Depends(get_current_user)):
    case_id = f"case_{uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "case_id": case_id,
        "reporter_id": user["user_id"],
        "reporter_name": user.get("name"),
        "status": "reported",
        "verified": False,
        "assigned_ngo_id": None,
        "assigned_police_id": None,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    await db.cases.insert_one(doc)
    await _timeline(case_id, "reported", {"by": user["user_id"]}, user["user_id"])
    await audit_log(user["user_id"], "case.create", case_id, {"type": payload.type})
    # kick off matching
    matches = await recompute_matches(doc)
    # notify reporter of any high matches
    for m in matches[:3]:
        if m["confidence"] in ("high", "medium"):
            await _notify(
                user["user_id"],
                "match",
                f"Possible match found ({m['confidence']} confidence)",
                f"We found a candidate report {m['distance_km']}km away.",
                case_id,
            )
    return {"case": {k: v for k, v in doc.items() if k != "_id"}, "matches": matches[:10]}


@router.get("")
async def list_cases(
    type: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = None,
    limit: int = 40,
    skip: int = 0,
):
    query: dict = {}
    if type:
        types = [t.strip() for t in type.split(",") if t.strip()]
        query["type"] = {"$in": types} if len(types) > 1 else types[0]
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        query["status"] = {"$in": statuses} if len(statuses) > 1 else statuses[0]
    if q:
        # simple text search on multiple fields
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"description": rx},
            {"breed": rx},
            {"color": rx},
            {"name": rx},
            {"species": rx},
            {"location.address": rx},
        ]
    cursor = db.cases.find(query, _proj()).sort("created_at", -1).skip(skip).limit(min(limit, 200))
    docs = await cursor.to_list(length=min(limit, 200))

    # optional radius filter (post-query so we don't need a 2dsphere index for MVP)
    if lat is not None and lng is not None and radius_km:
        filtered = []
        for d in docs:
            loc = d.get("location") or {}
            km = _haversine_km(lat, lng, loc.get("lat", 0), loc.get("lng", 0))
            if km <= radius_km:
                d["distance_km"] = round(km, 2)
                filtered.append(d)
        filtered.sort(key=lambda x: x.get("distance_km", 0))
        docs = filtered

    # fuzzy boost for q: reorder by heuristic if q provided
    if q and docs:
        def score_doc(d):
            s = 0.0
            s += _fuzzy_match(q, d.get("description"), COLOR_SYNONYMS)
            s += _fuzzy_match(q, d.get("breed"), BREED_SYNONYMS)
            s += _fuzzy_match(q, d.get("color"), COLOR_SYNONYMS)
            return s
        docs.sort(key=score_doc, reverse=True)

    total = await db.cases.count_documents(query)
    return {"items": docs, "total": total}


@router.get("/mine")
async def my_cases(user: dict = Depends(get_current_user)):
    docs = await db.cases.find({"reporter_id": user["user_id"]}, _proj()).sort("created_at", -1).to_list(length=200)
    return {"items": docs}


@router.get("/{case_id}")
async def get_case(case_id: str, user: Optional[dict] = Depends(get_current_user_optional)):
    case = await db.cases.find_one({"case_id": case_id}, _proj())
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    timeline = await db.case_timeline.find({"case_id": case_id}, _proj()).sort("created_at", 1).to_list(length=200)
    matches = await db.matches.find({"case_id": case_id}, _proj()).sort("score", -1).limit(20).to_list(length=20)
    # nearby (same type or complementary within 25km)
    loc = case.get("location") or {}
    nearby_cursor = db.cases.find({"case_id": {"$ne": case_id}, "status": {"$nin": ["closed", "spam"]}}, _proj()).limit(200)
    nearby_docs = await nearby_cursor.to_list(length=200)
    nearby = []
    for d in nearby_docs:
        dloc = d.get("location") or {}
        km = _haversine_km(loc.get("lat", 0), loc.get("lng", 0), dloc.get("lat", 0), dloc.get("lng", 0))
        if km <= 25:
            d["distance_km"] = round(km, 2)
            nearby.append(d)
    nearby.sort(key=lambda x: x.get("distance_km", 0))
    nearby = nearby[:8]

    can_message = bool(user) and (user.get("user_id") != case.get("reporter_id"))
    return {
        "case": case,
        "timeline": timeline,
        "matches": matches,
        "nearby": nearby,
        "can_message": can_message,
    }


@router.patch("/{case_id}")
async def update_case(case_id: str, payload: CaseUpdate, user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({"case_id": case_id}, _proj())
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    role = user.get("role")
    updates: dict = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    # ownership & role rules
    is_owner = case["reporter_id"] == user["user_id"]
    if not is_owner and role not in ("admin", "ngo", "police"):
        raise HTTPException(status_code=403, detail="Forbidden")
    # NGO can only affect pet cases; police only person cases
    if role == "ngo" and case["type"] not in ("lost_pet", "found_pet") and not is_owner:
        raise HTTPException(status_code=403, detail="NGO can only update pet cases")
    if role == "police" and case["type"] not in ("missing_person", "found_person") and not is_owner:
        raise HTTPException(status_code=403, detail="Police can only update person cases")
    if "verified" in updates and role != "admin":
        updates.pop("verified")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.cases.update_one({"case_id": case_id}, {"$set": updates})
    await _timeline(case_id, "updated", {"by": user["user_id"], "fields": list(updates.keys())}, user["user_id"])
    await audit_log(user["user_id"], "case.update", case_id, updates)
    if updates.get("status") in ("recovered", "located", "match_confirmed"):
        await _notify(case["reporter_id"], "status", f"Case status changed to {updates['status']}", "", case_id)
    fresh = await db.cases.find_one({"case_id": case_id}, _proj())
    return {"case": fresh}


@router.post("/{case_id}/rematch")
async def rematch(case_id: str, user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({"case_id": case_id}, _proj())
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    matches = await recompute_matches(case)
    return {"matches": matches[:20]}


@router.post("/{case_id}/assign")
async def assign_case(case_id: str, kind: str = Query(..., regex="^(ngo|police|self)$"), user: dict = Depends(get_current_user)):
    case = await db.cases.find_one({"case_id": case_id}, _proj())
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if kind == "ngo" and user.get("role") == "ngo":
        await db.cases.update_one({"case_id": case_id}, {"$set": {"assigned_ngo_id": user["user_id"], "status": "searching", "updated_at": datetime.now(timezone.utc).isoformat()}})
    elif kind == "police" and user.get("role") == "police":
        await db.cases.update_one({"case_id": case_id}, {"$set": {"assigned_police_id": user["user_id"], "status": "under_investigation", "updated_at": datetime.now(timezone.utc).isoformat()}})
    else:
        raise HTTPException(status_code=403, detail="Not allowed")
    await _timeline(case_id, f"assigned_{kind}", {"actor": user["user_id"]}, user["user_id"])
    await _notify(case["reporter_id"], "assignment", f"A verified {kind.upper()} took your case", user.get("org_name") or user.get("name", ""), case_id)
    fresh = await db.cases.find_one({"case_id": case_id}, _proj())
    return {"case": fresh}
