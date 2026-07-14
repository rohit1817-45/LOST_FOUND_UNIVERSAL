"""ULFN backend entrypoint."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from admin import router as admin_router  # noqa: E402
from auth import router as auth_router  # noqa: E402
from cases import router as cases_router  # noqa: E402
from deps import db  # noqa: E402
from messaging import router as messaging_router  # noqa: E402
from seed import ensure_indexes, seed_users  # noqa: E402

app = FastAPI(title="ULFN — Universal Lost & Found Network")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "ULFN API online", "service": "ulfn", "version": "1.0.0"}


@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True}
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
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ulfn")


@app.on_event("startup")
async def _startup():
    logger.info("ULFN starting: ensuring indexes and seeding demo users...")
    try:
        await ensure_indexes()
        await seed_users()
        logger.info("ULFN ready.")
    except Exception as exc:
        logger.exception("Startup failed: %s", exc)


@app.on_event("shutdown")
async def _shutdown():
    logger.info("ULFN shutting down.")
