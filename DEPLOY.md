# ULFN — Supabase Setup & Deployment Guide

## Part A · One-time Supabase setup (5 minutes)

You already provided your Supabase project keys and they are wired into the app.
The backend is running but is waiting for your database schema. Do these steps once:

### Step 1 — Run the schema migration

1. Open your Supabase project → **SQL Editor** → **New Query**.
2. Open the file `/app/supabase/migrations/00_schema.sql`, copy **all** its contents, paste into the editor and click **Run**.
3. You should see `Success. No rows returned`.

This creates 11 tables (`profiles`, `cases`, `case_timeline`, `matches`, `conversations`, `messages`, `notifications`, `verification_requests`, `saved_searches`, `bookmarks`, `audit_logs`), all indexes, RLS policies, the `handle_new_user` trigger, and the `search_cases` RPC function used for FTS + radius search.

### Step 2 — Create Storage buckets

Same SQL Editor → paste and run `/app/supabase/migrations/01_storage.sql`.

This creates three buckets:
- `report-images` (public, 10 MB max, jpeg/png/webp) — case photos
- `profile-images` (public, 5 MB max) — user avatars
- `ngo-documents` (private, 20 MB, pdf/img) — NGO verification docs

### Step 3 — Turn OFF email confirmation (for smooth signup during demo)

Supabase Dashboard → **Authentication** → **Providers** → **Email** →
- Uncheck **"Confirm email"** (or you can keep it on for production).

### Step 4 — (optional) Enable Google Sign-in

Supabase Dashboard → **Authentication** → **Providers** → **Google** →
- Toggle **Enable Sign in with Google** on.
- Follow Supabase's short guide to create a Google OAuth Client (they auto-fill the redirect URL).
- Add your production Vercel URL to **Site URL** and **Redirect URLs** later.

### Step 5 — Restart the backend

Once schema is loaded, restart the backend so it can seed the 4 demo users:

```bash
sudo supervisorctl restart backend
```

Watch the logs (`tail -f /var/log/supervisor/backend.err.log`); you should see
`ULFN ready. Demo accounts seeded.`

**Demo accounts** (password `Demo1234!`):
- `demo@ulfn.app` (user)
- `ngo@ulfn.app` (NGO, verified — HopePaws Rescue Mumbai)
- `police@ulfn.app` (police, verified — Mumbai Police - Andheri)
- `admin@ulfn.app` (admin)

---

## Part B · Deploy to Vercel (frontend) + Render (backend) + Supabase (DB)

### 1) Backend on Render

1. Push `/app/backend` to a GitHub repo (or push the whole `/app` and set root dir to `backend`).
2. Render → **New +** → **Web Service** → connect repo.
3. Configure:
   - **Runtime:** Python 3.11
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment variables** (add these under Environment):
     ```
     SUPABASE_URL=https://tcnxxdhajhschqmndpet.supabase.co
     SUPABASE_ANON_KEY=<your anon key>
     SUPABASE_SERVICE_ROLE_KEY=<your service role key>
     CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
     STORAGE_BUCKET_REPORTS=report-images
     STORAGE_BUCKET_PROFILE=profile-images
     STORAGE_BUCKET_DOCS=ngo-documents
     ```
   - **Auto-deploy:** on
4. Deploy. Copy the resulting URL (e.g. `https://ulfn-api.onrender.com`).

### 2) Frontend on Vercel

1. Push `/app/frontend` to a GitHub repo (or set root dir to `frontend`).
2. Vercel → **Add New Project** → import repo → framework **Create React App**.
3. **Environment Variables:**
   ```
   REACT_APP_BACKEND_URL=https://ulfn-api.onrender.com     ← your Render URL
   REACT_APP_SUPABASE_URL=https://tcnxxdhajhschqmndpet.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=<your anon key>
   ```
4. Deploy. Copy the Vercel URL and go back to **Render** → update `CORS_ORIGINS` to include it, then redeploy backend.

### 3) Supabase — production settings

- **Authentication → URL Configuration** → set:
  - Site URL: `https://your-vercel-app.vercel.app`
  - Redirect URLs (one per line):
    - `https://your-vercel-app.vercel.app/**`
    - `http://localhost:3000/**` (for local dev)

### 4) Optional — enable Realtime for messages & notifications

Dashboard → **Database** → **Replication** → toggle Realtime on for:
- `messages`
- `notifications`

(The current UI polls every 15 s. Switching to true Realtime is a small frontend change in `Messages.jsx` and `NotificationBell.jsx` — replace the `setInterval` with a `supabase.channel(...).on('postgres_changes',...)` subscription.)

---

## Part C · Local development

```bash
# backend
cd backend && pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# frontend
cd frontend && yarn && yarn start
```

## Data model overview (for viva)

- **profiles** — 1:1 with `auth.users` (Supabase). Fields: `user_id (uuid PK)`, `email`, `name`, `role` (`user|ngo|police|admin`), `verified`, `org_name`, `phone`, `suspended`.
- **cases** — the core report. Fields: `case_id (text PK)`, `reporter_id`, `type` (`lost_pet|found_pet|missing_person|found_person`), pet/person attributes, location (`lat`, `lng`, `address`, `city`, `state`, `country=India`), `photos jsonb`, `priority`, `status`, `verified`, `fts tsvector` (auto-maintained by trigger for full-text search).
- **case_timeline** — audit trail of events per case (`reported`, `verified`, `assigned_ngo`, `possible_match`, `recovered`, …).
- **matches** — deterministic matching results (`score`, `confidence`, `factors jsonb`).
- **conversations + messages** — in-app private messaging (participants array).
- **notifications** — per-user notification feed.
- **verification_requests** — NGO/police applications awaiting admin approval.
- **saved_searches, bookmarks** — user quality-of-life features.
- **audit_logs** — admin actions (verify, approve, suspend, mark spam, etc.).

## RLS at a glance

- `profiles` — public read; users update self; admins update any.
- `cases` — public read (except spam); insert = reporter; update = reporter/assigned/admin.
- `conversations/messages` — participants only.
- `notifications/saved_searches/bookmarks` — owner only.
- `verification_requests` — owner + admin can read; owner insert; admin decides.
- `audit_logs` — admin read only (backend writes via service role).

## Matching engine (explainable, no ML)

Given a source case, we score all complementary open cases with weights:
- species (0.15), breed (0.15, with synonym map), color (0.15, with synonym map),
- description overlap (0.15, token intersection),
- distance (0.25, banded haversine — 0 km→1.0, 5 km→0.8, 50 km→0.35, 300 km→0),
- time proximity (0.15, banded by days).

Bands: score ≥ 0.65 = **high**, ≥ 0.40 = **medium**, else **low**.

All factors are returned in the API response, so the UI can show "why we matched these".
