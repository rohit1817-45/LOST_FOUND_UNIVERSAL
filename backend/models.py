"""Pydantic models for ULFN."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ModelBase = ConfigDict(extra="ignore")

Role = Literal["user", "ngo", "police", "admin", "visitor"]
CaseType = Literal["lost_pet", "found_pet", "missing_person", "found_person"]
CaseStatus = Literal[
    "reported",
    "verified",
    "searching",
    "possible_match",
    "match_confirmed",
    "recovered",
    "closed",
    "under_investigation",
    "located",
    "spam",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserPublic(BaseModel):
    model_config = ModelBase
    user_id: str
    email: EmailStr
    name: str
    role: Role = "user"
    picture: Optional[str] = None
    verified: bool = False  # for NGO/police approval
    org_name: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=100)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class OAuthSessionInput(BaseModel):
    session_id: str


class CaseLocation(BaseModel):
    model_config = ModelBase
    lat: float
    lng: float
    address: Optional[str] = None


class CaseMediaItem(BaseModel):
    model_config = ModelBase
    media_id: str = Field(default_factory=lambda: f"m_{uuid4().hex[:10]}")
    data_url: str  # base64 data URL for v1
    thumb_url: Optional[str] = None


class CaseInput(BaseModel):
    type: CaseType
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    description: str = Field(min_length=1, max_length=2000)
    last_seen_at: Optional[str] = None  # ISO string
    location: CaseLocation
    photos: List[CaseMediaItem] = []
    contact_preference: Literal["in_app", "email"] = "in_app"
    priority: Literal["normal", "high", "critical"] = "normal"


class CaseUpdate(BaseModel):
    status: Optional[CaseStatus] = None
    description: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[Literal["normal", "high", "critical"]] = None
    verified: Optional[bool] = None
    assigned_ngo_id: Optional[str] = None
    assigned_police_id: Optional[str] = None


class VerificationApplyInput(BaseModel):
    kind: Literal["ngo", "police"]
    org_name: str
    registration_no: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    department: Optional[str] = None
    badge_id: Optional[str] = None
    jurisdiction: Optional[str] = None
    notes: Optional[str] = None


class MessageInput(BaseModel):
    conversation_id: Optional[str] = None
    to_user_id: Optional[str] = None
    case_id: Optional[str] = None
    text: str = Field(min_length=1, max_length=4000)
    attachment: Optional[str] = None  # data URL
    shared_location: Optional[CaseLocation] = None


class SavedSearchInput(BaseModel):
    name: str
    filters: dict
    center: Optional[CaseLocation] = None
    radius_km: Optional[float] = None
