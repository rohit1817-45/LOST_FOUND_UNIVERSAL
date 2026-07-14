-- =====================================================================
-- ULFN — Universal Lost & Found Network — Supabase Schema
-- =====================================================================
-- Instructions:
--   1) Open Supabase project → SQL Editor → New Query.
--   2) Paste this entire file, click "Run".
--   3) Then run 01_storage.sql to create storage buckets.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;         -- fuzzy text search
create extension if not exists unaccent;        -- accent-insensitive FTS
create extension if not exists cube;
create extension if not exists earthdistance;   -- lat/lng haversine

-- ---------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    email       text unique not null,
    name        text not null default '',
    picture     text,
    role        text not null default 'user' check (role in ('user','ngo','police','admin')),
    verified    boolean not null default false,
    org_name    text,
    phone       text,
    suspended   boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (user_id, email, name, picture, role)
    values (
        new.id,
        coalesce(new.email, ''),
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'picture',
        'user'
    )
    on conflict (user_id) do nothing;
    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- cases (reports)
-- ---------------------------------------------------------------------
create table if not exists public.cases (
    case_id            text primary key,          -- e.g. case_abc123
    reporter_id        uuid not null references public.profiles(user_id) on delete cascade,
    reporter_name      text,
    type               text not null check (type in ('lost_pet','found_pet','missing_person','found_person')),
    name               text,
    species            text,
    breed              text,
    color              text,
    age                text,
    gender             text,
    description        text not null,
    last_seen_at       timestamptz,
    priority           text not null default 'normal' check (priority in ('normal','high','critical')),
    contact_preference text not null default 'in_app',
    status             text not null default 'reported'
        check (status in ('reported','verified','searching','possible_match','match_confirmed','recovered','closed','under_investigation','located','spam')),
    verified           boolean not null default false,
    lat                double precision not null,
    lng                double precision not null,
    address            text,
    city               text,
    state              text,
    country            text default 'India',
    photos             jsonb not null default '[]'::jsonb,
    assigned_ngo_id    uuid references public.profiles(user_id),
    assigned_police_id uuid references public.profiles(user_id),
    fts                tsvector,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);
create index if not exists cases_type_status_idx on public.cases(type, status);
create index if not exists cases_reporter_idx on public.cases(reporter_id);
create index if not exists cases_created_idx on public.cases(created_at desc);
create index if not exists cases_fts_idx on public.cases using gin(fts);
create index if not exists cases_earth_idx on public.cases using gist (ll_to_earth(lat, lng));
create index if not exists cases_desc_trgm_idx on public.cases using gin (description gin_trgm_ops);

-- FTS trigger
create or replace function public.cases_fts_trigger() returns trigger language plpgsql as $$
begin
    new.fts :=
        setweight(to_tsvector('simple', unaccent(coalesce(new.name,''))), 'A') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.breed,''))), 'A') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.color,''))), 'B') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.species,''))), 'B') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.description,''))), 'C') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.address,''))), 'C') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.city,''))), 'C');
    new.updated_at := now();
    return new;
end $$;

drop trigger if exists cases_fts_update on public.cases;
create trigger cases_fts_update
before insert or update on public.cases
for each row execute function public.cases_fts_trigger();

-- ---------------------------------------------------------------------
-- case_timeline (events)
-- ---------------------------------------------------------------------
create table if not exists public.case_timeline (
    id          bigserial primary key,
    case_id     text not null references public.cases(case_id) on delete cascade,
    event       text not null,
    actor_id    uuid references public.profiles(user_id),
    meta        jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);
create index if not exists case_timeline_case_idx on public.case_timeline(case_id, created_at);

-- ---------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------
create table if not exists public.matches (
    id                bigserial primary key,
    case_id           text not null references public.cases(case_id) on delete cascade,
    candidate_id      text not null references public.cases(case_id) on delete cascade,
    score             numeric(4,3) not null,
    confidence        text not null check (confidence in ('low','medium','high')),
    distance_km       numeric(8,2),
    factors           jsonb not null default '{}'::jsonb,
    candidate_summary jsonb not null default '{}'::jsonb,
    created_at        timestamptz not null default now(),
    unique (case_id, candidate_id)
);
create index if not exists matches_case_score_idx on public.matches(case_id, score desc);

-- ---------------------------------------------------------------------
-- conversations & messages
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
    conversation_id text primary key,
    participants    uuid[] not null,
    case_id         text references public.cases(case_id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index if not exists conversations_participants_idx on public.conversations using gin(participants);

create table if not exists public.messages (
    message_id       text primary key,
    conversation_id  text not null references public.conversations(conversation_id) on delete cascade,
    from_user_id     uuid not null references public.profiles(user_id),
    from_name        text,
    text             text not null,
    attachment       text,
    shared_location  jsonb,
    created_at       timestamptz not null default now()
);
create index if not exists messages_conv_created_idx on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
    notif_id         text primary key,
    user_id          uuid not null references public.profiles(user_id) on delete cascade,
    type             text not null,
    title            text not null,
    body             text default '',
    case_id          text,
    conversation_id  text,
    read_at          timestamptz,
    created_at       timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- verification_requests (NGO/police applications)
-- ---------------------------------------------------------------------
create table if not exists public.verification_requests (
    request_id       text primary key,
    user_id          uuid not null references public.profiles(user_id) on delete cascade,
    applicant_name   text,
    applicant_email  text,
    kind             text not null check (kind in ('ngo','police')),
    org_name         text,
    registration_no  text,
    address          text,
    contact_phone    text,
    contact_email    text,
    department       text,
    badge_id         text,
    jurisdiction     text,
    notes            text,
    status           text not null default 'pending' check (status in ('pending','approved','rejected')),
    decided_at       timestamptz,
    decided_by       uuid references public.profiles(user_id),
    reason           text,
    created_at       timestamptz not null default now()
);
create index if not exists verify_status_idx on public.verification_requests(status);

-- ---------------------------------------------------------------------
-- saved_searches & bookmarks
-- ---------------------------------------------------------------------
create table if not exists public.saved_searches (
    search_id   text primary key,
    user_id     uuid not null references public.profiles(user_id) on delete cascade,
    name        text not null,
    filters     jsonb not null default '{}'::jsonb,
    center      jsonb,
    radius_km   numeric,
    created_at  timestamptz not null default now()
);
create index if not exists saved_user_idx on public.saved_searches(user_id);

create table if not exists public.bookmarks (
    user_id    uuid not null references public.profiles(user_id) on delete cascade,
    case_id    text not null references public.cases(case_id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key(user_id, case_id)
);

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
    log_id      text primary key,
    actor_id    uuid,
    action      text not null,
    target      text,
    meta        jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.cases                 enable row level security;
alter table public.case_timeline         enable row level security;
alter table public.matches               enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.notifications         enable row level security;
alter table public.verification_requests enable row level security;
alter table public.saved_searches        enable row level security;
alter table public.bookmarks             enable row level security;
alter table public.audit_logs            enable row level security;

-- Helper: is admin
create or replace function public.is_admin(uid uuid) returns boolean
language sql stable as $$
    select exists(select 1 from public.profiles p where p.user_id = uid and p.role = 'admin')
$$;

-- profiles: everyone reads; users update self; admins update anyone.
drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles for select using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update
    using (public.is_admin(auth.uid())) with check (true);

-- cases: public read for non-spam; reporter/assigned/admin can edit.
drop policy if exists cases_public_read on public.cases;
create policy cases_public_read on public.cases for select
    using (status != 'spam' or auth.uid() = reporter_id or public.is_admin(auth.uid()));

drop policy if exists cases_insert on public.cases;
create policy cases_insert on public.cases for insert
    with check (auth.uid() = reporter_id);

drop policy if exists cases_update on public.cases;
create policy cases_update on public.cases for update
    using (
        auth.uid() = reporter_id
        or auth.uid() = assigned_ngo_id
        or auth.uid() = assigned_police_id
        or public.is_admin(auth.uid())
    );

drop policy if exists cases_delete_admin on public.cases;
create policy cases_delete_admin on public.cases for delete
    using (public.is_admin(auth.uid()));

-- case_timeline & matches: readable by anyone (they mirror case visibility)
drop policy if exists timeline_read on public.case_timeline;
create policy timeline_read on public.case_timeline for select using (true);
drop policy if exists timeline_insert on public.case_timeline;
create policy timeline_insert on public.case_timeline for insert with check (true);

drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select using (true);

-- conversations & messages: only participants
drop policy if exists conv_read on public.conversations;
create policy conv_read on public.conversations for select using (auth.uid() = any(participants));
drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert with check (auth.uid() = any(participants));

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select using (
    exists(select 1 from public.conversations c where c.conversation_id = messages.conversation_id and auth.uid() = any(c.participants))
);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (auth.uid() = from_user_id);

-- notifications: only owner
drop policy if exists notif_rw on public.notifications;
create policy notif_rw on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- verification_requests
drop policy if exists vr_owner_read on public.verification_requests;
create policy vr_owner_read on public.verification_requests for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
drop policy if exists vr_owner_insert on public.verification_requests;
create policy vr_owner_insert on public.verification_requests for insert with check (auth.uid() = user_id);
drop policy if exists vr_admin_update on public.verification_requests;
create policy vr_admin_update on public.verification_requests for update using (public.is_admin(auth.uid()));

-- saved_searches, bookmarks
drop policy if exists ss_rw on public.saved_searches;
create policy ss_rw on public.saved_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists bm_rw on public.bookmarks;
create policy bm_rw on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit_logs: admin read only (backend service-role writes)
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Helper RPC: nearby cases (in km, with FTS ranking)
-- ---------------------------------------------------------------------
create or replace function public.search_cases(
    q text default null,
    center_lat double precision default null,
    center_lng double precision default null,
    radius_km double precision default null,
    types text[] default null,
    statuses text[] default null,
    lim int default 40,
    off int default 0
)
returns setof jsonb
language sql stable as $$
    select to_jsonb(c.*) || jsonb_build_object(
        'distance_km',
        case when center_lat is not null and center_lng is not null
             then round((earth_distance(ll_to_earth(c.lat, c.lng), ll_to_earth(center_lat, center_lng))/1000.0)::numeric, 2)
             else null end
    )
    from public.cases c
    where (types is null or c.type = any(types))
      and (statuses is null or c.status = any(statuses))
      and (q is null or c.fts @@ plainto_tsquery('simple', unaccent(q)) or c.description ilike '%'||q||'%' or c.breed ilike '%'||q||'%' or c.color ilike '%'||q||'%')
      and (
          center_lat is null or center_lng is null or radius_km is null
          or earth_distance(ll_to_earth(c.lat, c.lng), ll_to_earth(center_lat, center_lng)) <= radius_km * 1000
      )
    order by
        case when q is not null then ts_rank(c.fts, plainto_tsquery('simple', unaccent(q))) else 0 end desc,
        c.created_at desc
    limit lim offset off;
$$;
