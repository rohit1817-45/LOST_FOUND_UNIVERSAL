"""Seed demo/test users on startup so testing agent can log in without OAuth."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import bcrypt

from deps import db


def _hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


DEMO_ACCOUNTS = [
    {"email": "demo@ulfn.app", "password": "Demo1234!", "name": "Demo User", "role": "user", "verified": False},
    {"email": "ngo@ulfn.app", "password": "Demo1234!", "name": "HopePaws NGO", "role": "ngo", "verified": True, "org_name": "HopePaws Rescue"},
    {"email": "police@ulfn.app", "password": "Demo1234!", "name": "Officer Kim", "role": "police", "verified": True, "org_name": "Metro Police - Central"},
    {"email": "admin@ulfn.app", "password": "Demo1234!", "name": "Platform Admin", "role": "admin", "verified": True},
]


async def seed_users():
    for acc in DEMO_ACCOUNTS:
        existing = await db.users.find_one({"email": acc["email"]}, {"_id": 0})
        if existing:
            # Ensure the demo password matches (recover from any drift).
            await db.users.update_one(
                {"email": acc["email"]},
                {
                    "$set": {
                        "password_hash": _hash(acc["password"]),
                        "role": acc["role"],
                        "verified": acc.get("verified", False),
                        "org_name": acc.get("org_name"),
                        "name": acc["name"],
                    }
                },
            )
            continue
        await db.users.insert_one({
            "user_id": f"user_{uuid4().hex[:12]}",
            "email": acc["email"],
            "name": acc["name"],
            "role": acc["role"],
            "picture": None,
            "verified": acc.get("verified", False),
            "org_name": acc.get("org_name"),
            "auth_provider": "password",
            "password_hash": _hash(acc["password"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.cases.create_index("case_id", unique=True)
    await db.cases.create_index([("type", 1), ("status", 1), ("created_at", -1)])
    await db.matches.create_index([("case_id", 1), ("score", -1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.user_sessions.create_index("session_token", unique=True)
    await db.audit_logs.create_index([("created_at", -1)])
