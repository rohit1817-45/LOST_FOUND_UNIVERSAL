"""Deterministic matching engine for cases.

Given a source case, score all candidate cases of complementary type
(lost<->found) and return top matches with confidence bands.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from deps import db

COMPLEMENT: Dict[str, str] = {
    "lost_pet": "found_pet",
    "found_pet": "lost_pet",
    "missing_person": "found_person",
    "found_person": "missing_person",
}

# Fuzzy vocabulary for pet colors/breeds (small on purpose; extend later).
COLOR_SYNONYMS = {
    "brown": {"brown", "tan", "golden", "beige", "chocolate"},
    "black": {"black", "dark", "charcoal"},
    "white": {"white", "cream", "ivory", "snow"},
    "gray": {"gray", "grey", "silver"},
    "orange": {"orange", "ginger", "marmalade", "red"},
    "spotted": {"spotted", "dalmatian", "speckled"},
}

BREED_SYNONYMS = {
    "labrador": {"labrador", "lab"},
    "golden retriever": {"golden retriever", "golden", "retriever"},
    "german shepherd": {"german shepherd", "gsd", "alsatian"},
    "poodle": {"poodle", "doodle"},
    "bulldog": {"bulldog", "bully"},
    "terrier": {"terrier", "jack russell", "yorkie"},
    "husky": {"husky", "siberian husky"},
    "beagle": {"beagle"},
    "persian": {"persian", "persian cat"},
    "siamese": {"siamese"},
    "tabby": {"tabby", "striped"},
}


def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _fuzzy_match(a: Optional[str], b: Optional[str], vocab: Dict[str, set]) -> float:
    a_n, b_n = _norm(a), _norm(b)
    if not a_n or not b_n:
        return 0.0
    if a_n == b_n:
        return 1.0
    # substring
    if a_n in b_n or b_n in a_n:
        return 0.75
    # shared vocabulary bucket
    for _, syns in vocab.items():
        if any(s in a_n for s in syns) and any(s in b_n for s in syns):
            return 0.7
    # token overlap
    at, bt = set(a_n.split()), set(b_n.split())
    if at and bt:
        overlap = len(at & bt) / max(1, len(at | bt))
        if overlap > 0.3:
            return 0.5 * overlap + 0.1
    return 0.0


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _distance_score(km: float) -> float:
    # 0km -> 1.0, 5km -> 0.7, 25km -> 0.4, 100km -> 0.1, >200km -> 0
    if km <= 1:
        return 1.0
    if km <= 5:
        return 0.8
    if km <= 15:
        return 0.6
    if km <= 50:
        return 0.35
    if km <= 150:
        return 0.15
    if km <= 300:
        return 0.05
    return 0.0


def _time_score(a_iso: Optional[str], b_iso: Optional[str]) -> float:
    if not a_iso or not b_iso:
        return 0.3
    try:
        a = datetime.fromisoformat(a_iso.replace("Z", "+00:00"))
        b = datetime.fromisoformat(b_iso.replace("Z", "+00:00"))
    except Exception:
        return 0.3
    if a.tzinfo is None:
        a = a.replace(tzinfo=timezone.utc)
    if b.tzinfo is None:
        b = b.replace(tzinfo=timezone.utc)
    days = abs((a - b).total_seconds()) / 86400.0
    if days <= 1:
        return 1.0
    if days <= 7:
        return 0.7
    if days <= 30:
        return 0.4
    if days <= 180:
        return 0.15
    return 0.05


def _desc_score(a: Optional[str], b: Optional[str]) -> float:
    a_n, b_n = _norm(a), _norm(b)
    if not a_n or not b_n:
        return 0.0
    at = {t for t in a_n.split() if len(t) > 2}
    bt = {t for t in b_n.split() if len(t) > 2}
    if not at or not bt:
        return 0.0
    inter = at & bt
    return min(1.0, len(inter) / max(3, len(at | bt) * 0.5))


def score_pair(a: dict, b: dict) -> Dict[str, Any]:
    factors = {}
    factors["color"] = _fuzzy_match(a.get("color"), b.get("color"), COLOR_SYNONYMS)
    factors["breed"] = _fuzzy_match(a.get("breed"), b.get("breed"), BREED_SYNONYMS)
    factors["species"] = 1.0 if _norm(a.get("species")) == _norm(b.get("species")) and a.get("species") else 0.0
    factors["description"] = _desc_score(a.get("description"), b.get("description"))

    a_loc = a.get("location") or {}
    b_loc = b.get("location") or {}
    km = _haversine_km(a_loc.get("lat", 0.0), a_loc.get("lng", 0.0), b_loc.get("lat", 0.0), b_loc.get("lng", 0.0))
    factors["distance_km"] = round(km, 2)
    factors["distance"] = _distance_score(km)
    factors["time"] = _time_score(a.get("last_seen_at"), b.get("last_seen_at"))

    # weighted sum
    weights = {
        "species": 0.15,
        "breed": 0.15,
        "color": 0.15,
        "description": 0.15,
        "distance": 0.25,
        "time": 0.15,
    }
    score = sum(factors[k] * w for k, w in weights.items())
    score = round(min(1.0, max(0.0, score)), 3)

    if score >= 0.65:
        confidence = "high"
    elif score >= 0.4:
        confidence = "medium"
    else:
        confidence = "low"

    return {"score": score, "confidence": confidence, "factors": factors, "distance_km": factors["distance_km"]}


async def recompute_matches(case: dict, limit: int = 50) -> List[dict]:
    complement = COMPLEMENT.get(case["type"])
    if not complement:
        return []
    # pull complementary open cases
    cursor = db.cases.find(
        {
            "type": complement,
            "status": {"$nin": ["closed", "recovered", "spam"]},
            "case_id": {"$ne": case["case_id"]},
        },
        {"_id": 0},
    ).limit(500)
    candidates = await cursor.to_list(length=500)

    results: List[dict] = []
    for cand in candidates:
        s = score_pair(case, cand)
        if s["score"] < 0.15:
            continue
        results.append({
            "case_id": case["case_id"],
            "candidate_id": cand["case_id"],
            "candidate_summary": {
                "case_id": cand["case_id"],
                "type": cand["type"],
                "name": cand.get("name"),
                "breed": cand.get("breed"),
                "color": cand.get("color"),
                "species": cand.get("species"),
                "description": cand.get("description", "")[:180],
                "location": cand.get("location"),
                "first_photo": (cand.get("photos") or [{}])[0].get("data_url") if cand.get("photos") else None,
                "last_seen_at": cand.get("last_seen_at"),
                "created_at": cand.get("created_at"),
            },
            **s,
        })

    results.sort(key=lambda r: r["score"], reverse=True)
    results = results[:limit]

    # persist: replace previous match set for this case
    await db.matches.delete_many({"case_id": case["case_id"]})
    if results:
        await db.matches.insert_many([{**r} for r in results])

    # if a high match exists, bump status of the source case if it's still 'reported'/'verified'
    if results and results[0]["confidence"] in ("high", "medium") and case.get("status") in ("reported", "verified", "searching"):
        await db.cases.update_one(
            {"case_id": case["case_id"]},
            {"$set": {"status": "possible_match", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        await db.case_timeline.insert_one({
            "case_id": case["case_id"],
            "event": "possible_match",
            "meta": {"top_score": results[0]["score"], "candidate_id": results[0]["candidate_id"]},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return results
