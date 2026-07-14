"""Seed demo/test users into Supabase Auth so the app is testable.

Also verifies the schema is present. If tables don't exist we print
instructions to run supabase/migrations/*.sql in the Supabase SQL Editor.
"""
from __future__ import annotations

import logging
from typing import Optional
from uuid import uuid4

from deps import sb

logger = logging.getLogger("ulfn.seed")

DEMO_ACCOUNTS = [
    {"email": "demo@ulfn.app",   "password": "Demo1234!", "name": "Demo User",       "role": "user",   "verified": False, "org_name": None},
    {"email": "ngo@ulfn.app",    "password": "Demo1234!", "name": "HopePaws NGO",    "role": "ngo",    "verified": True,  "org_name": "HopePaws Rescue Mumbai"},
    {"email": "police@ulfn.app", "password": "Demo1234!", "name": "Officer Kumar",   "role": "police", "verified": True,  "org_name": "Mumbai Police - Andheri"},
    {"email": "admin@ulfn.app",  "password": "Demo1234!", "name": "Platform Admin",  "role": "admin",  "verified": True,  "org_name": None},
]


async def verify_schema() -> bool:
    """Return True when schema is present and reachable."""
    try:
        sb.table("profiles").select("user_id", count="exact").limit(1).execute()
        return True
    except Exception as exc:
        logger.error("\n" + "=" * 70)
        logger.error("ULFN schema not found in Supabase. Please run migrations:")
        logger.error("  1) Open your Supabase project → SQL Editor → New Query")
        logger.error("  2) Paste /app/supabase/migrations/00_schema.sql and Run")
        logger.error("  3) Paste /app/supabase/migrations/01_storage.sql and Run")
        logger.error(f"Error was: {exc}")
        logger.error("=" * 70 + "\n")
        return False


def _find_user_by_email(email: str) -> Optional[dict]:
    # supabase-py admin list_users returns paginated users
    try:
        page = 1
        while page < 20:
            users = sb.auth.admin.list_users(page=page, per_page=100)
            if not users:
                return None
            for u in users:
                if (getattr(u, "email", None) or "").lower() == email.lower():
                    return {"id": u.id, "email": u.email}
            if len(users) < 100:
                return None
            page += 1
    except Exception:
        return None
    return None


async def seed_users():
    for acc in DEMO_ACCOUNTS:
        try:
            existing = _find_user_by_email(acc["email"])
            if existing:
                uid = existing["id"]
                # ensure password is Demo1234! (re-sync so tests always work)
                try:
                    sb.auth.admin.update_user_by_id(uid, {"password": acc["password"], "email_confirm": True, "user_metadata": {"name": acc["name"]}})
                except Exception as exc:
                    logger.warning("could not update demo user %s: %s", acc["email"], exc)
            else:
                created = sb.auth.admin.create_user({
                    "email": acc["email"],
                    "password": acc["password"],
                    "email_confirm": True,
                    "user_metadata": {"name": acc["name"]},
                })
                uid = created.user.id if created and created.user else None
                if not uid:
                    logger.error("failed to create demo user %s", acc["email"])
                    continue

            # upsert profile row with role & verified
            sb.table("profiles").upsert({
                "user_id": uid,
                "email": acc["email"],
                "name": acc["name"],
                "role": acc["role"],
                "verified": acc["verified"],
                "org_name": acc["org_name"],
            }, on_conflict="user_id").execute()
        except Exception as exc:
            logger.exception("seed error for %s: %s", acc["email"], exc)
