-- CIVICOS — Supabase Postgres schema (prototype target)
--
-- The demo backend (backend/app/store/demo.py) mirrors this schema exactly.
-- When SUPABASE_URL / SUPABASE_SERVICE_KEY are configured, the SupabaseStore
-- adapter maps to these tables 1:1. Evidence images go to Supabase Storage
-- (bucket: civicos-evidence); rows store the storage path, not the bytes.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type issue_type as enum (
  'roads', 'garbage', 'water', 'streetlights', 'drainage', 'accessibility', 'other'
);
create type severity as enum ('low', 'medium', 'high', 'critical');
create type incident_status as enum (
  'reported', 'verified', 'in_progress', 'assigned', 'resolved', 'resolution_verified'
);
create type verification_result as enum ('verified', 'issue_present', 'needs_review');
create type ai_mode as enum ('demo', 'live');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table users (
  id          uuid primary key default gen_random_uuid(),
  auth_uid    uuid references auth.users (id) on delete cascade,  -- null for demo accounts
  name        text not null,
  first_name  text generated always as (split_part(name, ' ', 1)) stored,
  email       text unique,
  area        text,
  initials    text,
  created_at  timestamptz not null default now()
);

create table observations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users (id) on delete cascade,
  image_path     text,                          -- Supabase Storage path (or data URI in demo)
  latitude       double precision not null,
  longitude      double precision not null,
  location_label text,
  observed_at    timestamptz not null default now(),
  issue_type     issue_type not null,
  confidence     double precision not null default 0.8 check (confidence between 0 and 1),
  severity       severity not null default 'medium',
  description    text not null default '',
  embedding      jsonb,                         -- float[] in prototype; pgvector in production
  ai_mode        ai_mode not null default 'demo',
  created_at     timestamptz not null default now()
);
create index observations_geo_idx on observations (latitude, longitude);
create index observations_user_idx on observations (user_id, observed_at desc);
create index observations_type_idx on observations (issue_type, observed_at desc);

create table incidents (
  id                text primary key,                 -- human ID: HYD-RD-2048
  issue_type        issue_type not null,
  title             text not null,
  latitude          double precision not null,
  longitude         double precision not null,
  location_label    text not null,
  severity          severity not null,
  priority          severity not null,
  status            incident_status not null default 'reported',
  department        text,
  summary           text not null,
  first_seen        timestamptz not null,
  last_seen         timestamptz not null,
  worsening         boolean not null default false,
  embedding         jsonb,
  created_at        timestamptz not null default now()
);
create index incidents_geo_idx on incidents (latitude, longitude);
create index incidents_status_idx on incidents (status, last_seen desc);
create index incidents_type_idx on incidents (issue_type);

-- Observation ↔ incident membership (the clustering result)
create table incident_observations (
  incident_id      text not null references incidents (id) on delete cascade,
  observation_id   uuid not null references observations (id) on delete cascade,
  similarity_score double precision,
  created_at       timestamptz not null default now(),
  primary key (incident_id, observation_id)
);
create index incident_obs_obs_idx on incident_observations (observation_id);

create table timeline_events (
  id          uuid primary key default gen_random_uuid(),
  incident_id text not null references incidents (id) on delete cascade,
  event_type  text not null,   -- observation|verified|severity|assigned|in_progress|resolved|verification|complaint
  label       text not null,
  detail      text not null default '',
  actor       text not null,
  metadata    jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index timeline_incident_idx on timeline_events (incident_id, occurred_at);

create table resolutions (
  id                    uuid primary key default gen_random_uuid(),
  incident_id           text not null references incidents (id) on delete cascade,
  resolved_by           text not null,
  notes                 text not null default '',
  evidence_path         text,                    -- "after" evidence from the department
  before_observation_id uuid references observations (id),
  resolved_at           timestamptz not null default now()
);
create unique index resolutions_incident_idx on resolutions (incident_id);

create table verifications (
  id             uuid primary key default gen_random_uuid(),
  resolution_id  uuid not null references resolutions (id) on delete cascade,
  verified_by    uuid references users (id),
  after_image    text not null,                  -- storage path or data URI
  location_match boolean,
  visual_match   double precision,
  result         verification_result not null,
  rationale      jsonb not null default '[]',
  created_at     timestamptz not null default now()
);
create index verifications_resolution_idx on verifications (resolution_id, created_at desc);

create table complaint_drafts (
  id               uuid primary key default gen_random_uuid(),
  incident_id      text not null references incidents (id) on delete cascade,
  created_by       uuid references users (id),
  issue            text not null,
  location         text not null,
  description      text not null,                -- full letter body
  severity_context text not null default '',
  evidence_refs    jsonb not null default '[]',  -- observation IDs
  department       text not null,
  status           text not null default 'draft', -- draft|review|submitted_demo|submitted
  connector        text not null default 'demo',  -- 'demo' today; 'ghmc-api' later
  demo_reference   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index complaint_incident_idx on complaint_drafts (incident_id);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  type        text not null,   -- report|activity|resolution|verification|assignment|complaint
  title       text not null,
  body        text not null default '',
  incident_id text references incidents (id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security (sketch — enable per environment)
--
-- Product stance: citizens read all incidents (civic visibility) but only
-- mutate their own rows. In production, incident writes (assign/resolve)
-- move to a service role / ops dashboard.
-- ---------------------------------------------------------------------------
-- alter table observations     enable row level security;
-- alter table incidents        enable row level security;
-- alter table incident_observations enable row level security;
-- alter table timeline_events  enable row level security;
-- alter table notifications    enable row level security;
-- alter table complaint_drafts enable row level security;
--
-- create policy "incidents are public read" on incidents for select using (true);
-- create policy "timeline is public read" on timeline_events for select using (true);
-- create policy "own observations" on observations for all
--   using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());
-- create policy "own notifications" on notifications for all
--   using (user_id = (select id from users where auth_uid = auth.uid()))
--   with check (user_id = (select id from users where auth_uid = auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('civicos-evidence', 'civicos-evidence', true);
-- Path convention: {incident_id}/{observation_id}.jpg
