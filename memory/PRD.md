# ULFN — Universal Lost & Found Network

Production-ready platform to reunite lost pets with owners and locate missing persons by connecting citizens, verified NGOs, shelters, and law enforcement through one intelligent network.

**Live app:** https://reunite-lost-found.preview.emergentagent.com

## Stack (as built)

- **Frontend:** React 19 + React Router + shadcn/ui + Tailwind + Framer Motion (via shadcn) + Leaflet/OpenStreetMap + Recharts
- **Backend:** FastAPI + Motor (async MongoDB) + JWT + bcrypt
- **Auth:** JWT email/password + Emergent Google OAuth (cookie session)
- **Maps:** Leaflet + OpenStreetMap tiles (free, no key required) + react-leaflet-cluster
- **Notifications:** In-app (polling)

## Phase status

- [x] **Phase 1** — Integration playbook + Design guidelines (skipped standalone POC; core is standard CRUD + deterministic matching; no risky external integration)
- [x] **Phase 2** — Full v1 build & E2E testing (100% backend, 95% frontend passed on first testing pass)

## Feature coverage (all 5 roles delivered)

- Public Visitor — browse map, search, filter, case details (read)
- Registered User — full report wizard (4 report types), photos, matches, dashboard, messages, notifications, saved bookmarks, apply for NGO/police verification
- Verified NGO — nearby pet queue, accept rescue, update status
- Verified Police — investigation queue, critical alerts, take investigation
- Admin — verifications approval, cases moderation (verify/mark spam), users, audit log, analytics dashboards

## Demo/Test accounts (password: `Demo1234!`)
- `demo@ulfn.app`, `ngo@ulfn.app`, `police@ulfn.app`, `admin@ulfn.app`

## Future roadmap (scaffolded, not built)
- AI: pet image similarity, facial similarity (with legal review), NLP semantic search, OCR from posters, voice reporting, multilingual translation, spam detection
- Push notifications via Firebase Cloud Messaging
- WebSocket real-time messaging
- Mobile apps (React Native / Flutter) reusing the same REST APIs
