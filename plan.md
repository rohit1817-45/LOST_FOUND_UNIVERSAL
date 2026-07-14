# plan.md — Universal Lost & Found Network (ULFN)

## 1) Objectives
- Deliver a production-ready ULFN on **React + FastAPI + MongoDB** with **Leaflet/OSM maps**, **JWT + Google OAuth**, **in-app notifications**, **secure messaging**, **RBAC (5 roles)**, and an **MVP-grade** but complete UX.
- Prove the **core workflow** works end-to-end: create a case (lost/found) with location + photos → browse/search on map → generate match candidates → message → update timeline/status.
- Keep AI features **scaffolded only** (interfaces, placeholders), not implemented.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation: OAuth + Geo+Search+Matching)
**Goal:** De-risk the failure-prone parts before full build (Google OAuth + geo queries + matching).

**User stories (POC)**
1. As a user, I can complete Google login and receive a session/JWT to access protected endpoints.
2. As a user, I can create a lost pet case with a map-picked location and multiple photos.
3. As a visitor, I can search cases within a radius around a point and see sorted results.
4. As a user, I can trigger matching and see confidence-ranked possible matches.
5. As a user, I can open a case and see a timeline entry for each action.

**Steps**
- Websearch: best practices for **FastAPI Google OAuth** in SPA + JWT session handling; and **MongoDB geospatial indexes** + radius queries.
- Minimal FastAPI POC service:
  - Mongo models: `users`, `cases`, `case_media`, `case_timeline`, `matches`.
  - Create **2dsphere** index on `cases.location`.
  - Endpoints: `POST /cases`, `GET /cases/search`, `POST /matches/recompute?caseId=...`, `GET /cases/{id}`.
- Minimal OAuth POC:
  - `/auth/google/start` → `/auth/google/callback` (Emergent) → issue app JWT.
  - Verify token exchange + redirect works in this environment.
- Deterministic matching POC:
  - Score = weighted sum of (entity type match, distance buckets, time delta buckets, color/breed/species fuzzy overlap, status compatibility).
  - Output confidence: Low/Medium/High.
- POC test scripts (Python):
  - `test_oauth_flow.md` manual steps + `test_api_cases.py` (seed cases + geo search + match recompute).
- **Exit gate:** OAuth flow works; geo search returns correct radius ordering; matching produces stable ranked output.

---

### Phase 2 — V1 App Development (MVP build around proven core; auth deferred until end)
**Goal:** Ship the working product with all roles/features in MVP form; implement UI/UX + API fully.

**User stories (V1)**
1. As a visitor, I can browse a map with clustered markers and filter by lost/found + pets/persons.
2. As a registered user, I can file a report in under 30 seconds with auto-location and photo upload.
3. As a user, I can view possible matches and start a private chat without exposing phone/email.
4. As an NGO, I can accept a rescue request, update rescue status, and upload evidence.
5. As police, I can update a missing person case status (Under Investigation → Located/Recovered → Closed).
6. As admin, I can approve NGO/police applications and see audit logs of changes.

**Backend (FastAPI) build**
- Architecture:
  - Modules: `auth`, `rbac`, `cases`, `search`, `matching`, `media`, `messaging`, `notifications`, `admin`, `audit`.
  - Pydantic validation; centralized error format.
- Data model (Mongo collections + indexes):
  - `users`, `profiles`, `org_ngos`, `org_police`, `verification_requests`.
  - `cases` (4 types) with `2dsphere` on `location`, compound indexes on `(type,status,createdAt)`.
  - `case_media` (base64 for v1, thumbnails), `case_timeline`.
  - `matches` (caseId, candidateId, score, confidence, factors).
  - `conversations`, `messages` (text + image + shared location).
  - `notifications` (userId, type, payload, readAt), `saved_searches`, `bookmarks`.
  - `audit_logs` (who/what/when + before/after snapshot).
- Core endpoints (REST):
  - Cases: create/edit/resolve, details, timeline, moderation flags.
  - Search: filters + radius + text query (fuzzy).
  - Matching: recompute on create/update; list matches per case.
  - Messaging: create conversation, send message, list messages.
  - Notifications: list/mark-read; polling support.
  - Admin: approve/deny NGO/police, suspend/restore users, remove spam, category/config.
- Security:
  - RBAC middleware dependency; rate limiting on auth/report creation; image size limits.

**Frontend (React) build**
- App shell:
  - Route groups: Public, User, NGO, Police, Admin; role-based navigation.
  - Design: minimal UI, dark/light mode, responsive.
- Core pages:
  - Home + map browse; Search results list + map sync.
  - Report wizard (single fast form): type → details → location picker → photos → submit.
  - Case details: gallery, map, timeline, matches, nearby reports, chat CTA.
  - Dashboards: User/NGO/Police/Admin (MVP charts + tables).
  - Messaging center; Notifications bell w/ polling.
- Maps (Leaflet/OSM):
  - Marker clustering, legend, filters; radius circle; heatmap (MVP).
  - Location picker: browser geolocation + draggable marker + address search (Nominatim).

**Auth integration (end of Phase 2)**
- Add JWT email/password first; then wire Google OAuth once stable.
- Role assignment flows:
  - User default.
  - NGO/police application → `pending` until admin approves.

**End-of-phase testing (1 full round)**
- E2E flows: visitor browse/search; user report→match→message; NGO accept rescue; police status update; admin approvals + audit logs.

---

### Phase 3 — Hardening + Production Features (post-v1 stabilization)
**User stories (Hardening)**
1. As a user, I can manage notification preferences and saved searches that trigger nearby alerts.
2. As admin, I can quickly detect spam/duplicates and take action with a full audit trail.
3. As a user, I can upload images reliably with compression and clear progress/errors.
4. As a user, I can export/share a case link safely without leaking private info.
5. As ops, I can monitor performance and slow queries and improve indexes.

**Steps**
- Upgrade media storage path (replace base64 with file storage abstraction; keep v1 fallback).
- Improve search: better fuzzy matching, synonym map, query normalization; caching.
- Improve matching: feature flags + weight tuning + evaluation set.
- Add moderation tools: report abuse, shadow-ban spam, admin queues.
- Add observability: structured logs, request IDs, slow-query logging.
- Testing: regression sweep + load test smoke (search + map) + security checks.

---

### Phase 4+ — Roadmap (Scaffolded AI + realtime)
**User stories (Roadmap)**
1. As a user, I can find matches using image similarity to reduce false negatives.
2. As a user, I can speak a report and have it transcribed into the form.
3. As a user, I can translate a case into my language automatically.
4. As a user, I receive realtime message updates (websockets).
5. As admin, I can use AI-assisted spam detection and priority scoring.

**Steps**
- Implement AI modules behind interfaces: `ImageSimilarityProvider`, `NLPEmbeddingProvider`.
- Websockets for chat/notifications; background jobs for matching recompute.

## 3) Next Actions
1. Run Phase 1 websearch + implement minimal FastAPI POC for OAuth + geo search + matching.
2. Execute POC tests (manual OAuth + Python seed/search/match). Fix until green.
3. Build Phase 2 full app (backend+frontend) in one cohesive pass; then add auth near the end.
4. Run 1 end-to-end testing pass; fix all critical UX/data-flow bugs.

## 4) Success Criteria
- Core flow works: create case with photos+location → appears on map/search → match candidates generated → chat works → timeline/status updates persist.
- RBAC enforced: visitor read-only; user/NGO/police/admin capabilities correctly restricted.
- Map UX: clustering + filters + radius search functional on mobile and desktop.
- Notifications: in-app bell + polling reliably reflects messages/matches/status updates.
- Admin verification + audit logs: approvals and key actions are traceable.
- Performance: searches paginate, geo queries use indexes, map loads without freezing at scale.