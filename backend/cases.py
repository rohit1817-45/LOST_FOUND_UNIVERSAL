"""Cases router (Supabase edition)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import audit_log, get_current_user, get_current_user_optional, sb
from matching import _fuzzy_match, _haversine_km, recompute_matches, COLOR_SYNONYMS, BREED_SYNONYMS
from models import CaseInput, CaseUpdate

router = APIRouter(prefix="/cases", tags=["cases"])


async def _timeline(case_id: str, event: str, meta: Optional[dict] = None, actor_id: Optional[str] = None):
    sb.table("case_timeline").insert({
        "case_id": case_id,
        "event": event,
        "actor_id": actor_id,
        "meta": meta or {},
    }).execute()


async def _notify(user_id: str, ntype: str, title: str, body: str, case_id: Optional[str] = None):
    sb.table("notifications").insert({
        "notif_id": f"n_{uuid4().hex[:10]}",
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "case_id": case_id,
    }).execute()


def _flatten_case_input(payload: CaseInput, reporter_id: str, reporter_name: Optional[str]) -> dict:
    loc = payload.location.model_dump()
    now = datetime.now(timezone.utc).isoformat()
    return {
        "case_id": f"case_{uuid4().hex[:12]}",
        "reporter_id": reporter_id,
        "reporter_name": reporter_name,
        "type": payload.type,
        "name": payload.name,
        "species": payload.species,
        "breed": payload.breed,
        "color": payload.color,
        "age": payload.age,
        "gender": payload.gender,
        "description": payload.description,
        "last_seen_at": payload.last_seen_at,
        "priority": payload.priority,
        "contact_preference": payload.contact_preference,
        "status": "reported",
        "verified": False,
        "lat": loc["lat"], "lng": loc["lng"], "address": loc.get("address"),
        "city": loc.get("city"), "state": loc.get("state"), "country": loc.get("country") or "India",
        "photos": [p.model_dump() for p in payload.photos],
        "created_at": now, "updated_at": now,
    }


def _pack_location(row: dict) -> dict:
    row = dict(row)
    row["location"] = {
        "lat": row.get("lat"), "lng": row.get("lng"), "address": row.get("address"),
        "city": row.get("city"), "state": row.get("state"), "country": row.get("country"),
    }
    return row


@router.post("")
async def create_case(payload: CaseInput, user: dict = Depends(get_current_user)):
    doc = _flatten_case_input(payload, user["user_id"], user.get("name"))
    sb.table("cases").insert(doc).execute()
    await _timeline(doc["case_id"], "reported", {"by": user["user_id"]}, user["user_id"])
    await audit_log(user["user_id"], "case.create", doc["case_id"], {"type": payload.type})
    matches = await recompute_matches(doc)
    for m in matches[:3]:
        if m["confidence"] in ("high", "medium"):
            await _notify(user["user_id"], "match",
                          f"Possible match found ({m['confidence']} confidence)",
                          f"A candidate report was found {m['distance_km']} km away.", doc["case_id"])
    return {"case": _pack_location(doc), "matches": matches[:10]}


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
    types = [t for t in (type or "").split(",") if t]
    statuses = [s for s in (status or "").split(",") if s]
    # Prefer the SQL RPC (uses FTS + earthdistance). Fall back to plain table if RPC missing.
    try:
        rpc_res = sb.rpc("search_cases", {
            "q": q or None,
            "center_lat": lat, "center_lng": lng, "radius_km": radius_km,
            "types": types or None, "statuses": statuses or None,
            "lim": min(limit, 200), "off": skip,
        }).execute()
        docs: List[dict] = rpc_res.data or []
    except Exception:
        query = sb.table("cases").select("*")
        if types: query = query.in_("type", types)
        if statuses: query = query.in_("status", statuses)
        query = query.order("created_at", desc=True).limit(min(limit, 200))
        res = query.execute()
        docs = res.data or []
        if q:
            docs = [d for d in docs if q.lower() in (d.get("description") or "").lower() or q.lower() in (d.get("breed") or "").lower() or q.lower() in (d.get("color") or "").lower()]
        if lat is not None and lng is not None and radius_km:
            filtered = []
            for d in docs:
                km = _haversine_km(lat, lng, d.get("lat", 0), d.get("lng", 0))
                if km <= radius_km:
                    d["distance_km"] = round(km, 2)
                    filtered.append(d)
            docs = filtered

    docs = [_pack_location(d) for d in docs]

    # fuzzy boost
    if q and docs:
        def score_doc(d):
            s = 0.0
            s += _fuzzy_match(q, d.get("description"), COLOR_SYNONYMS)
            s += _fuzzy_match(q, d.get("breed"), BREED_SYNONYMS)
            s += _fuzzy_match(q, d.get("color"), COLOR_SYNONYMS)
            return s
        docs.sort(key=score_doc, reverse=True)

    total_res = sb.table("cases").select("case_id", count="exact").limit(1).execute()
    total = total_res.count if getattr(total_res, "count", None) is not None else len(docs)
    # NOTE: `total` reflects the total number of cases in the table; the RPC
    # already applied filters+radius, so `docs` is the correctly paginated slice.
    return {"items": docs, "total": total, "returned": len(docs)}


@router.get("/mine")
async def my_cases(user: dict = Depends(get_current_user)):
    res = sb.table("cases").select("*").eq("reporter_id", user["user_id"]).order("created_at", desc=True).execute()
    return {"items": [_pack_location(d) for d in (res.data or [])]}


@router.get("/{case_id}")
async def get_case(case_id: str, user: Optional[dict] = Depends(get_current_user_optional)):
    row = sb.table("cases").select("*").eq("case_id", case_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Case not found")
    c = _pack_location(row.data[0])

    timeline_res = sb.table("case_timeline").select("*").eq("case_id", case_id).order("created_at", desc=False).execute()
    matches_res = sb.table("matches").select("*").eq("case_id", case_id).order("score", desc=True).limit(20).execute()

    # nearby (within 25 km, excluding same case & spam/closed)
    all_res = sb.table("cases").select("*").neq("case_id", case_id).not_.in_("status", ["spam", "closed"]).limit(200).execute()
    nearby = []
    for d in all_res.data or []:
        km = _haversine_km(c["lat"], c["lng"], d.get("lat", 0), d.get("lng", 0))
        if km <= 25:
            d = _pack_location(d)
            d["distance_km"] = round(km, 2)
            nearby.append(d)
    nearby.sort(key=lambda x: x.get("distance_km", 0))
    nearby = nearby[:8]

    can_message = bool(user) and (user.get("user_id") != c.get("reporter_id"))
    return {
        "case": c,
        "timeline": timeline_res.data or [],
        "matches": matches_res.data or [],
        "nearby": nearby,
        "can_message": can_message,
    }


@router.patch("/{case_id}")
async def update_case(case_id: str, payload: CaseUpdate, user: dict = Depends(get_current_user)):
    row = sb.table("cases").select("*").eq("case_id", case_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = row.data[0]
    role = user.get("role")
    is_owner = case["reporter_id"] == user["user_id"]
    updates = payload.model_dump(exclude_none=True)

    if not is_owner and role not in ("admin", "ngo", "police"):
        raise HTTPException(status_code=403, detail="Forbidden")
    is_person = case["type"] in ("missing_person", "found_person")
    if role == "ngo" and is_person and not is_owner:
        raise HTTPException(status_code=403, detail="NGO can only update pet cases")
    if role == "police" and not is_person and not is_owner:
        raise HTTPException(status_code=403, detail="Police can only update person cases")
    if "verified" in updates and role != "admin":
        updates.pop("verified")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    sb.table("cases").update(updates).eq("case_id", case_id).execute()
    await _timeline(case_id, "updated", {"by": user["user_id"], "fields": list(updates.keys())}, user["user_id"])
    await audit_log(user["user_id"], "case.update", case_id, updates)
    if updates.get("status") in ("recovered", "located", "match_confirmed"):
        await _notify(case["reporter_id"], "status", f"Case status changed to {updates['status']}", "", case_id)
    fresh = sb.table("cases").select("*").eq("case_id", case_id).limit(1).execute()
    return {"case": _pack_location(fresh.data[0])}


@router.post("/{case_id}/rematch")
async def rematch(case_id: str, user: dict = Depends(get_current_user)):
    row = sb.table("cases").select("*").eq("case_id", case_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Case not found")
    matches = await recompute_matches(row.data[0])
    return {"matches": matches[:20]}


@router.post("/{case_id}/assign")
async def assign_case(case_id: str, kind: str = Query(..., regex="^(ngo|police|self)$"), user: dict = Depends(get_current_user)):
    row = sb.table("cases").select("*").eq("case_id", case_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = row.data[0]
    now = datetime.now(timezone.utc).isoformat()
    if kind == "ngo" and user.get("role") == "ngo":
        sb.table("cases").update({"assigned_ngo_id": user["user_id"], "status": "searching", "updated_at": now}).eq("case_id", case_id).execute()
    elif kind == "police" and user.get("role") == "police":
        sb.table("cases").update({"assigned_police_id": user["user_id"], "status": "under_investigation", "updated_at": now}).eq("case_id", case_id).execute()
    else:
        raise HTTPException(status_code=403, detail="Not allowed")
    await _timeline(case_id, f"assigned_{kind}", {"actor": user["user_id"]}, user["user_id"])
    await _notify(case["reporter_id"], "assignment", f"A verified {kind.upper()} took your case", user.get("org_name") or user.get("name", ""), case_id)
    fresh = sb.table("cases").select("*").eq("case_id", case_id).limit(1).execute()
    return {"case": _pack_location(fresh.data[0])}
