-- ═══════════════════════════════════════════════════════════════════════════
-- Bizora — Supabase / PostgreSQL schema
--
-- Run this once in the Supabase SQL editor, or:
--   psql "$SUPABASE_DB_URL" -f apps/api/db/schema.sql
--
-- Structured analysis blocks are stored as jsonb so the Builder Agent can
-- evolve without a migration, while the columns that get queried or filtered
-- on — scores, session status, the three answer dimensions — stay scalar and
-- indexable.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── users ─────────────────────────────────────────────────────────────────
-- Mirrors auth.users when Supabase Auth is enabled. The id is the auth user id
-- so row-level security can bind directly to auth.uid().
create table if not exists public.users (
  id            uuid primary key,
  email         text not null unique,
  display_name  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'Application-level profile for each founder.';

-- ── startups ──────────────────────────────────────────────────────────────
create table if not exists public.startups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  idea         text not null check (char_length(idea) between 25 and 1000),
  startup_name text,
  created_at   timestamptz not null default now()
);

create index if not exists startups_user_id_idx on public.startups (user_id, created_at desc);

-- ── analyses ──────────────────────────────────────────────────────────────
create table if not exists public.analyses (
  id                   uuid primary key default gen_random_uuid(),
  startup_id           uuid not null references public.startups (id) on delete cascade,

  startup_name         text not null,
  summary              text not null,

  business_profile     jsonb not null,
  market_opportunity   jsonb not null,
  competitor_snapshot  jsonb not null,
  scores               jsonb not null,
  mvp_roadmap          jsonb not null,
  cost_revenue         jsonb not null,

  -- { estimateNotice: string, degraded: boolean, provider: string }
  meta                 jsonb not null default '{}'::jsonb,

  created_at           timestamptz not null default now(),

  -- Every analysis row must carry the five sub-scores and a computed overall.
  constraint analyses_scores_shape check (
    scores ?& array['marketPotential', 'problemSolutionFit', 'innovation', 'feasibility', 'revenuePotential', 'overall']
  ),
  constraint analyses_scores_range check (
    (scores->>'overall')::numeric between 0 and 100
  )
);

create index if not exists analyses_startup_id_idx on public.analyses (startup_id, created_at desc);

-- ── investor_sessions ─────────────────────────────────────────────────────
do $$ begin
  create type public.session_status as enum ('not_started', 'in_progress', 'completed');
exception when duplicate_object then null;
end $$;

create table if not exists public.investor_sessions (
  id          uuid primary key default gen_random_uuid(),
  startup_id  uuid not null references public.startups (id) on delete cascade,
  user_id     uuid not null references public.users (id) on delete cascade,
  status      public.session_status not null default 'not_started',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists investor_sessions_startup_id_idx on public.investor_sessions (startup_id, created_at desc);
create index if not exists investor_sessions_user_id_idx on public.investor_sessions (user_id);

-- ── responses ─────────────────────────────────────────────────────────────
do $$ begin
  create type public.investor_question_key as enum ('why_now', 'competitive_advantage', 'customer_acquisition');
exception when duplicate_object then null;
end $$;

create table if not exists public.responses (
  id                          uuid primary key default gen_random_uuid(),
  session_id                  uuid not null references public.investor_sessions (id) on delete cascade,

  question_key                public.investor_question_key not null,
  question                    text not null,
  answer                      text not null,

  clarity_score               smallint not null check (clarity_score between 0 and 10),
  market_understanding_score  smallint not null check (market_understanding_score between 0 and 10),
  financial_reasoning_score   smallint not null check (financial_reasoning_score between 0 and 10),

  -- { clarity: {score,explanation,improvement}, …, verdict, averageScore }
  feedback                    jsonb not null,

  created_at                  timestamptz not null default now(),

  -- One answer per question per session.
  unique (session_id, question_key)
);

create index if not exists responses_session_id_idx on public.responses (session_id, created_at);

-- ── reports ───────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id                       uuid primary key default gen_random_uuid(),
  startup_id               uuid not null references public.startups (id) on delete cascade,

  investor_readiness_score smallint not null check (investor_readiness_score between 0 and 100),

  strengths                jsonb not null,
  weaknesses               jsonb not null,
  suggestions              jsonb not null,
  next_steps               jsonb not null default '[]'::jsonb,
  overall_feedback         text not null,

  -- The complete report: band, score breakdown, generatedAt, degraded flag.
  payload                  jsonb not null,

  created_at               timestamptz not null default now(),

  constraint reports_strengths_count check (jsonb_array_length(strengths) between 3 and 5),
  constraint reports_weaknesses_count check (jsonb_array_length(weaknesses) between 3 and 5),
  constraint reports_suggestions_count check (jsonb_array_length(suggestions) between 2 and 3)
);

create index if not exists reports_startup_id_idx on public.reports (startup_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row-level security
--
-- The API uses the service-role key and enforces ownership itself; these
-- policies make the data safe if the tables are ever read directly from the
-- browser with the anon key.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.users            enable row level security;
alter table public.startups         enable row level security;
alter table public.analyses         enable row level security;
alter table public.investor_sessions enable row level security;
alter table public.responses        enable row level security;
alter table public.reports          enable row level security;

-- users: read and update only your own row.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- startups: owner-only access.
drop policy if exists startups_all_own on public.startups;
create policy startups_all_own on public.startups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- analyses: reachable through the startup you own.
drop policy if exists analyses_all_own on public.analyses;
create policy analyses_all_own on public.analyses
  for all using (
    exists (select 1 from public.startups s where s.id = startup_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.startups s where s.id = startup_id and s.user_id = auth.uid())
  );

-- investor_sessions: owner-only.
drop policy if exists investor_sessions_all_own on public.investor_sessions;
create policy investor_sessions_all_own on public.investor_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- responses: reachable through a session you own.
drop policy if exists responses_all_own on public.responses;
create policy responses_all_own on public.responses
  for all using (
    exists (
      select 1 from public.investor_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.investor_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- reports: reachable through a startup you own.
drop policy if exists reports_all_own on public.reports;
create policy reports_all_own on public.reports
  for all using (
    exists (select 1 from public.startups s where s.id = startup_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.startups s where s.id = startup_id and s.user_id = auth.uid())
  );