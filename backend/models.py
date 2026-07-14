"""Pydantic models for ULFN (Supabase edition)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ModelBase = ConfigDict(extra="ignore")

Role = Literal["user", "ngo", "police", "admin"]
CaseType = Literal["lost_pet", "found_pet", "missing_person", "found_person"]
CaseStatus = Literal[
    "reported", "verified", "searching", "possible_match",
    "match_confirmed", "recovered", "closed",
    "under_investigation", "located", "spam",
]


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None
    phone: Optional[str] = None


class CaseLocation(BaseModel):
    model_config = ModelBase
    lat: float
    lng: float
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"


class CaseMediaItem(BaseModel):
    model_config = ModelBase
    media_id: str = Field(default_factory=lambda: f"m_{uuid4().hex[:10]}")
    url: str            # public URL from Supabase Storage
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
    last_seen_at: Optional[str] = None
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
    org_name: Optional[str] = None
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
    attachment: Optional[str] = None
    shared_location: Optional[CaseLocation] = None


class SavedSearchInput(BaseModel):
    name: str
    filters: dict
    center: Optional[CaseLocation] = None
    radius_km: Optional[float] = None
