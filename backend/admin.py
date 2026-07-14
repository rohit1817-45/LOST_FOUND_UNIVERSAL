"""Admin router: NGO/police verification, moderation, users, analytics, audit logs."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException

from deps import audit_log, db, get_current_user, require_roles
from models import VerificationApplyInput

router = APIRouter(tags=["admin-and-verification"])


# ------- Verification apply (self-service) -------

@router.post("/verifications/apply")
async def apply_verification(payload: VerificationApplyInput, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.verification_requests.find_one({"user_id": user["user_id"], "status": "pending"}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending application")
    doc = {
        "request_id": f"vr_{uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "applicant_name": user.get("name"),
        "applicant_email": user.get("email"),
        "status": "pending",
        **payload.model_dump(),
        "created_at": now,
    }
    await db.verification_requests.insert_one(doc)
    await audit_log(user["user_id"], "verification.apply", doc["request_id"], {"kind": payload.kind})
    return {"request": doc}


@router.get("/verifications/mine")
async def my_verifications(user: dict = Depends(get_current_user)):
    items = await db.verification_requests.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"items": items}


# ------- Admin: NGO/police approval -------

@router.get("/admin/verifications")
async def admin_list_verifications(status: Optional[str] = "pending", _: dict = Depends(require_roles("admin"))):
    q = {}
    if status:
        q["status"] = status
    items = await db.verification_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": items}


@router.post("/admin/verifications/{request_id}/approve")
async def admin_approve(request_id: str, admin: dict = Depends(require_roles("admin"))):
    req = await db.verification_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.verification_requests.update_one({"request_id": request_id}, {"$set": {"status": "approved", "decided_at": now, "decided_by": admin["user_id"]}})
    role = req["kind"]  # 'ngo' or 'police'
    await db.users.update_one(
        {"user_id": req["user_id"]},
        {"$set": {"role": role, "verified": True, "org_name": req.get("org_name")}},
    )
    await db.notifications.insert_one({
        "notif_id": f"n_{uuid4().hex[:10]}",
        "user_id": req["user_id"],
        "type": "verification",
        "title": f"Your {role.upper()} application was approved",
        "body": "You now have access to your verified dashboard.",
        "created_at": now,
        "read_at": None,
    })
    await audit_log(admin["user_id"], "verification.approve", request_id, {"kind": role})
    return {"ok": True}


@router.post("/admin/verifications/{request_id}/reject")
async def admin_reject(request_id: str, reason: str = Body("", embed=True), admin: dict = Depends(require_roles("admin"))):
    req = await db.verification_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.verification_requests.update_one({"request_id": request_id}, {"$set": {"status": "rejected", "decided_at": now, "decided_by": admin["user_id"], "reason": reason}})
    await db.notifications.insert_one({
        "notif_id": f"n_{uuid4().hex[:10]}",
        "user_id": req["user_id"],
        "type": "verification",
        "title": f"Your {req['kind'].upper()} application was rejected",
        "body": reason or "Please contact support.",
        "created_at": now,
        "read_at": None,
    })
    await audit_log(admin["user_id"], "verification.reject", request_id, {"reason": reason})
    return {"ok": True}


# ------- Admin: users -------

@router.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_roles("admin")), q: Optional[str] = None):
    query = {}
    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200).to_list(200)
    return {"items": users}


@router.post("/admin/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin: dict = Depends(require_roles("admin"))):
    await db.users.update_one({"user_id": user_id}, {"$set": {"suspended": True}})
    await audit_log(admin["user_id"], "user.suspend", user_id)
    return {"ok": True}


@router.post("/admin/users/{user_id}/restore")
async def restore_user(user_id: str, admin: dict = Depends(require_roles("admin"))):
    await db.users.update_one({"user_id": user_id}, {"$set": {"suspended": False}})
    await audit_log(admin["user_id"], "user.restore", user_id)
    return {"ok": True}


# ------- Admin: cases moderation -------

@router.get("/admin/cases")
async def admin_list_cases(status: Optional[str] = None, verified: Optional[bool] = None, _: dict = Depends(require_roles("admin"))):
    q = {}
    if status:
        q["status"] = status
    if verified is not None:
        q["verified"] = verified
    docs = await db.cases.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return {"items": docs}


@router.post("/admin/cases/{case_id}/verify")
async def admin_verify_case(case_id: str, admin: dict = Depends(require_roles("admin"))):
    await db.cases.update_one({"case_id": case_id}, {"$set": {"verified": True, "status": "verified", "updated_at": datetime.now(timezone.utc).isoformat()}})
    await db.case_timeline.insert_one({"case_id": case_id, "event": "admin_verified", "actor_id": admin["user_id"], "created_at": datetime.now(timezone.utc).isoformat()})
    await audit_log(admin["user_id"], "case.verify", case_id)
    return {"ok": True}


@router.post("/admin/cases/{case_id}/mark-spam")
async def admin_mark_spam(case_id: str, admin: dict = Depends(require_roles("admin"))):
    await db.cases.update_one({"case_id": case_id}, {"$set": {"status": "spam", "updated_at": datetime.now(timezone.utc).isoformat()}})
    await audit_log(admin["user_id"], "case.mark_spam", case_id)
    return {"ok": True}


# ------- Admin: analytics -------

@router.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_roles("admin"))):
    total = await db.cases.count_documents({})
    by_type = {}
    for t in ("lost_pet", "found_pet", "missing_person", "found_person"):
        by_type[t] = await db.cases.count_documents({"type": t})
    recovered = await db.cases.count_documents({"status": {"$in": ["recovered", "located", "match_confirmed"]}})
    pending_ngo = await db.verification_requests.count_documents({"status": "pending", "kind": "ngo"})
    pending_police = await db.verification_requests.count_documents({"status": "pending", "kind": "police"})
    pending_reports = await db.cases.count_documents({"verified": False, "status": {"$nin": ["spam", "closed"]}})
    verified_reports = await db.cases.count_documents({"verified": True})
    spam_reports = await db.cases.count_documents({"status": "spam"})
    users = await db.users.count_documents({})
    # monthly stats (last 6 months by count)
    pipeline = [
        {"$group": {"_id": {"$substr": ["$created_at", 0, 7]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 24},
    ]
    monthly = await db.cases.aggregate(pipeline).to_list(24)
    recovery_rate = round((recovered / total) * 100, 1) if total else 0
    return {
        "total": total,
        "by_type": by_type,
        "recovered": recovered,
        "pending_ngo": pending_ngo,
        "pending_police": pending_police,
        "pending_reports": pending_reports,
        "verified_reports": verified_reports,
        "spam_reports": spam_reports,
        "users": users,
        "monthly": [{"month": m["_id"], "count": m["count"]} for m in monthly if m["_id"]],
        "recovery_rate": recovery_rate,
    }


@router.get("/admin/audit")
async def admin_audit(_: dict = Depends(require_roles("admin")), limit: int = 100):
    items = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": items}


# ------- NGO / Police queues -------

@router.get("/ngo/queue")
async def ngo_queue(user: dict = Depends(require_roles("ngo", "admin"))):
    # Pets nearby (broad by default; UI adds location) - for simplicity list all recent pet cases
    q = {"type": {"$in": ["lost_pet", "found_pet"]}, "status": {"$nin": ["closed", "recovered", "spam"]}}
    docs = await db.cases.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    accepted = await db.cases.find({"assigned_ngo_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    completed = await db.cases.find({"assigned_ngo_id": user["user_id"], "status": {"$in": ["recovered", "match_confirmed", "closed"]}}, {"_id": 0}).to_list(200)
    return {"nearby": docs, "accepted": accepted, "completed": completed}


@router.get("/police/queue")
async def police_queue(user: dict = Depends(require_roles("police", "admin"))):
    q = {"type": {"$in": ["missing_person", "found_person"]}, "status": {"$nin": ["closed", "located", "spam"]}}
    docs = await db.cases.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    critical = await db.cases.find({"type": {"$in": ["missing_person"]}, "priority": {"$in": ["high", "critical"]}, "status": {"$nin": ["closed", "located"]}}, {"_id": 0}).limit(50).to_list(50)
    resolved = await db.cases.find({"assigned_police_id": user["user_id"], "status": {"$in": ["located", "closed", "recovered"]}}, {"_id": 0}).to_list(200)
    return {"queue": docs, "critical": critical, "resolved": resolved}
