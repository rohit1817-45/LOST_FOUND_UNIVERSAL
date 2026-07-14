"""Admin router (Supabase edition)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException

from deps import audit_log, bust_token_cache, get_current_user, require_roles, sb
from models import VerificationApplyInput

router = APIRouter(tags=["admin-and-verification"])


# ------- Verification apply (self-service) -------

@router.post("/verifications/apply")
async def apply_verification(payload: VerificationApplyInput, user: dict = Depends(get_current_user)):
    existing = sb.table("verification_requests").select("*").eq("user_id", user["user_id"]).eq("status", "pending").limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="You already have a pending application")
    doc = {
        "request_id": f"vr_{uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "applicant_name": user.get("name"),
        "applicant_email": user.get("email"),
        "status": "pending",
        **payload.model_dump(),
    }
    sb.table("verification_requests").insert(doc).execute()
    await audit_log(user["user_id"], "verification.apply", doc["request_id"], {"kind": payload.kind})
    return {"request": doc}


@router.get("/verifications/mine")
async def my_verifications(user: dict = Depends(get_current_user)):
    res = sb.table("verification_requests").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).execute()
    return {"items": res.data or []}


# ------- Admin: NGO/police approval -------

@router.get("/admin/verifications")
async def admin_list_verifications(status: Optional[str] = "pending", _: dict = Depends(require_roles("admin"))):
    q = sb.table("verification_requests").select("*")
    if status:
        q = q.eq("status", status)
    res = q.order("created_at", desc=True).limit(200).execute()
    return {"items": res.data or []}


@router.post("/admin/verifications/{request_id}/approve")
async def admin_approve(request_id: str, admin: dict = Depends(require_roles("admin"))):
    row = sb.table("verification_requests").select("*").eq("request_id", request_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = row.data[0]
    now = datetime.now(timezone.utc).isoformat()
    sb.table("verification_requests").update({"status": "approved", "decided_at": now, "decided_by": admin["user_id"]}).eq("request_id", request_id).execute()
    role = req["kind"]
    sb.table("profiles").update({"role": role, "verified": True, "org_name": req.get("org_name")}).eq("user_id", req["user_id"]).execute()
    sb.table("notifications").insert({
        "notif_id": f"n_{uuid4().hex[:10]}",
        "user_id": req["user_id"],
        "type": "verification",
        "title": f"Your {role.upper()} application was approved",
        "body": "You now have access to your verified dashboard.",
    }).execute()
    bust_token_cache()
    await audit_log(admin["user_id"], "verification.approve", request_id, {"kind": role})
    return {"ok": True}


@router.post("/admin/verifications/{request_id}/reject")
async def admin_reject(request_id: str, reason: str = Body("", embed=True), admin: dict = Depends(require_roles("admin"))):
    row = sb.table("verification_requests").select("*").eq("request_id", request_id).limit(1).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = row.data[0]
    now = datetime.now(timezone.utc).isoformat()
    sb.table("verification_requests").update({"status": "rejected", "decided_at": now, "decided_by": admin["user_id"], "reason": reason}).eq("request_id", request_id).execute()
    sb.table("notifications").insert({
        "notif_id": f"n_{uuid4().hex[:10]}",
        "user_id": req["user_id"],
        "type": "verification",
        "title": f"Your {req['kind'].upper()} application was rejected",
        "body": reason or "Please contact support.",
    }).execute()
    await audit_log(admin["user_id"], "verification.reject", request_id, {"reason": reason})
    return {"ok": True}


# ------- Admin: users -------

@router.get("/admin/users")
async def admin_list_users(_: dict = Depends(require_roles("admin")), q: Optional[str] = None):
    query = sb.table("profiles").select("*")
    if q:
        query = query.or_(f"email.ilike.%{q}%,name.ilike.%{q}%")
    res = query.order("created_at", desc=True).limit(200).execute()
    return {"items": res.data or []}


@router.post("/admin/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin: dict = Depends(require_roles("admin"))):
    sb.table("profiles").update({"suspended": True}).eq("user_id", user_id).execute()
    bust_token_cache()
    await audit_log(admin["user_id"], "user.suspend", user_id)
    return {"ok": True}


@router.post("/admin/users/{user_id}/restore")
async def restore_user(user_id: str, admin: dict = Depends(require_roles("admin"))):
    sb.table("profiles").update({"suspended": False}).eq("user_id", user_id).execute()
    bust_token_cache()
    await audit_log(admin["user_id"], "user.restore", user_id)
    return {"ok": True}


# ------- Admin: cases -------

@router.get("/admin/cases")
async def admin_list_cases(status: Optional[str] = None, verified: Optional[bool] = None, _: dict = Depends(require_roles("admin"))):
    q = sb.table("cases").select("*")
    if status: q = q.eq("status", status)
    if verified is not None: q = q.eq("verified", verified)
    res = q.order("created_at", desc=True).limit(200).execute()
    return {"items": res.data or []}


@router.post("/admin/cases/{case_id}/verify")
async def admin_verify_case(case_id: str, admin: dict = Depends(require_roles("admin"))):
    now = datetime.now(timezone.utc).isoformat()
    sb.table("cases").update({"verified": True, "status": "verified", "updated_at": now}).eq("case_id", case_id).execute()
    sb.table("case_timeline").insert({"case_id": case_id, "event": "admin_verified", "actor_id": admin["user_id"]}).execute()
    await audit_log(admin["user_id"], "case.verify", case_id)
    return {"ok": True}


@router.post("/admin/cases/{case_id}/mark-spam")
async def admin_mark_spam(case_id: str, admin: dict = Depends(require_roles("admin"))):
    now = datetime.now(timezone.utc).isoformat()
    sb.table("cases").update({"status": "spam", "updated_at": now}).eq("case_id", case_id).execute()
    await audit_log(admin["user_id"], "case.mark_spam", case_id)
    return {"ok": True}


# ------- Admin: analytics -------

def _count(table: str, filters: Optional[dict] = None) -> int:
    q = sb.table(table).select("*", count="exact").limit(1)
    if filters:
        for k, v in filters.items():
            q = q.eq(k, v)
    res = q.execute()
    return res.count or 0


@router.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_roles("admin"))):
    total = _count("cases")
    by_type = {t: _count("cases", {"type": t}) for t in ("lost_pet", "found_pet", "missing_person", "found_person")}
    recovered = 0
    for s in ("recovered", "located", "match_confirmed"):
        recovered += _count("cases", {"status": s})
    pending_ngo = sb.table("verification_requests").select("*", count="exact").eq("status", "pending").eq("kind", "ngo").limit(1).execute().count or 0
    pending_police = sb.table("verification_requests").select("*", count="exact").eq("status", "pending").eq("kind", "police").limit(1).execute().count or 0
    pending_reports = sb.table("cases").select("*", count="exact").eq("verified", False).not_.in_("status", ["spam", "closed"]).limit(1).execute().count or 0
    verified_reports = _count("cases", {"verified": True})
    spam_reports = _count("cases", {"status": "spam"})
    users = _count("profiles")
    # monthly buckets
    all_cases = sb.table("cases").select("created_at").limit(2000).execute().data or []
    counts: dict[str, int] = {}
    for c in all_cases:
        m = (c.get("created_at") or "")[:7]
        if m:
            counts[m] = counts.get(m, 0) + 1
    monthly = [{"month": m, "count": counts[m]} for m in sorted(counts.keys())[-12:]]
    recovery_rate = round((recovered / total) * 100, 1) if total else 0.0
    return {
        "total": total, "by_type": by_type, "recovered": recovered,
        "pending_ngo": pending_ngo, "pending_police": pending_police,
        "pending_reports": pending_reports, "verified_reports": verified_reports,
        "spam_reports": spam_reports, "users": users,
        "monthly": monthly, "recovery_rate": recovery_rate,
    }


@router.get("/admin/audit")
async def admin_audit(_: dict = Depends(require_roles("admin")), limit: int = 100):
    res = sb.table("audit_logs").select("*").order("created_at", desc=True).limit(limit).execute()
    return {"items": res.data or []}


# ------- NGO / Police queues -------

@router.get("/ngo/queue")
async def ngo_queue(user: dict = Depends(require_roles("ngo", "admin"))):
    nearby = sb.table("cases").select("*").in_("type", ["lost_pet", "found_pet"]).not_.in_("status", ["closed", "recovered", "spam"]).order("created_at", desc=True).limit(200).execute().data or []
    accepted = sb.table("cases").select("*").eq("assigned_ngo_id", user["user_id"]).order("updated_at", desc=True).limit(200).execute().data or []
    completed = sb.table("cases").select("*").eq("assigned_ngo_id", user["user_id"]).in_("status", ["recovered", "match_confirmed", "closed"]).limit(200).execute().data or []
    return {"nearby": nearby, "accepted": accepted, "completed": completed}


@router.get("/police/queue")
async def police_queue(user: dict = Depends(require_roles("police", "admin"))):
    queue = sb.table("cases").select("*").in_("type", ["missing_person", "found_person"]).not_.in_("status", ["closed", "located", "spam"]).order("created_at", desc=True).limit(200).execute().data or []
    critical = sb.table("cases").select("*").eq("type", "missing_person").in_("priority", ["high", "critical"]).not_.in_("status", ["closed", "located"]).limit(50).execute().data or []
    resolved = sb.table("cases").select("*").eq("assigned_police_id", user["user_id"]).in_("status", ["located", "closed", "recovered"]).limit(200).execute().data or []
    return {"queue": queue, "critical": critical, "resolved": resolved}
