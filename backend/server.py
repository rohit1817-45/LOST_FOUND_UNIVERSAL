"""ULFN backend entrypoint (Supabase edition)."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from admin import router as admin_router          # noqa: E402
from auth import router as auth_router            # noqa: E402
from cases import router as cases_router          # noqa: E402
from deps import sb                               # noqa: E402
from messaging import router as messaging_router  # noqa: E402
from seed import seed_users, verify_schema        # noqa: E402

app = FastAPI(title="ULFN — Universal Lost & Found Network")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "ULFN API online", "service": "ulfn", "version": "2.0.0-supabase"}


@api_router.get("/health")
async def health():
    try:
        sb.table("profiles").select("user_id", count="exact").limit(1).execute()
        return {"ok": True, "db": "supabase"}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


api_router.include_router(auth_router)
api_router.include_router(cases_router)
api_router.include_router(messaging_router)
api_router.include_router(admin_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()] or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ulfn")


@app.on_event("startup")
async def _startup():
    logger.info("ULFN starting (Supabase edition)...")
    ok = await verify_schema()
    if ok:
        try:
            await seed_users()
            logger.info("ULFN ready. Demo accounts seeded.")
        except Exception as exc:
            logger.exception("Seed failed: %s", exc)
    else:
        logger.warning("ULFN started, but Supabase schema is missing. Run migrations, then restart.")


@app.on_event("shutdown")
async def _shutdown():
    logger.info("ULFN shutting down.")
