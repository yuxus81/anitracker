-- =====================================================================
-- 0004_source_mal_id.sql
-- Adds `source_mal_id` to `animes`: for a placeholder continuation this
-- records the MAL id of the season the user last finished, so the daily
-- sync can watch that season's relations and auto-upgrade the placeholder
-- into a concrete, tracked entry the moment an official sequel appears.
-- Fully additive & idempotent: safe to run once on the existing project.
-- =====================================================================

alter table public.animes add column if not exists source_mal_id integer;

comment on column public.animes.source_mal_id is
  'For placeholder continuations: MAL id of the finished season whose sequel we are waiting on. Null for normal entries.';
