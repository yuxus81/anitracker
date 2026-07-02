-- =====================================================================
-- 0001_schema.sql
-- Adds the new typed columns/enums to the existing `animes` table.
-- Fully additive & idempotent: safe to run once on the existing project.
-- Does NOT touch data yet and does NOT drop the old `meta`/franchise_* columns.
-- Run 0002 (data migration) next, then 0003 (RLS), then verify, then the
-- optional cleanup block at the bottom of 0002.
-- =====================================================================

-- ---------- Enums ----------
do $$ begin
  create type anime_category as enum ('watched', 'next_season', 'watchlist', 'current');
exception when duplicate_object then null; end $$;

do $$ begin
  create type anime_status as enum ('active', 'dead', 'limbo', 'superseded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type anime_format as enum ('season', 'movie', 'finished');
exception when duplicate_object then null; end $$;

-- ---------- New columns on `animes` ----------
-- Ownership (was missing entirely in the old app -> the root security bug).
alter table public.animes add column if not exists user_id uuid;

-- Feine Zustände (replaces the DEAD/LIMBO/SUPERSEDED magic strings).
alter table public.animes add column if not exists status anime_status not null default 'active';

-- Only meaningful for next_season entries.
alter table public.animes add column if not exists format anime_format;

-- Human-readable release hint, e.g. "Winter 2027", "Datum unbekannt".
alter table public.animes add column if not exists release_label text;

-- Placeholder slot without a known concrete title yet.
alter table public.animes add column if not exists is_placeholder boolean not null default false;

-- When the daily sync detected "now released" (replaces UPDATED|ts).
alter table public.animes add column if not exists last_updated_at timestamptz;

-- Manual ordering for watchlist/current (replaces the localStorage order hack).
alter table public.animes add column if not exists sort_order double precision;

-- Cached franchise stats (seasons/movies/episodes/last_scan).
alter table public.animes add column if not exists franchise_meta jsonb;

-- Ensure is_released exists with a sane default (it already does in the old table).
alter table public.animes add column if not exists is_released boolean not null default false;

-- New rows automatically belong to the calling user.
alter table public.animes alter column user_id set default auth.uid();

-- Helpful indexes for the queries the app runs.
create index if not exists animes_user_category_idx on public.animes (user_id, category);
create index if not exists animes_user_status_idx on public.animes (user_id, status);

-- =====================================================================
-- push_subscriptions table (Web Push, activated later).
-- =====================================================================
-- Drop first in case an earlier run left a partial/mismatched table.
-- Safe: this table holds no data yet (Web Push is not active).
drop table if exists public.push_subscriptions cascade;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  subscription jsonb not null,
  -- Plain column written by the client (see pushClient.ts), NOT auto-generated.
  endpoint text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_user_endpoint_uidx
  on public.push_subscriptions (user_id, endpoint);
