-- =====================================================================
-- 0002_migrate_meta.sql
-- Migrates the OLD single `meta` string encoding into the new typed columns
-- added by 0001. Run AFTER 0001 and AFTER taking a backup.
--
-- IMPORTANT: step 1 backfills user_id from the auth.users email below.
-- If your account email differs, change it before running.
--
-- This script is idempotent for the derivations (re-running produces the same
-- result) as long as the old `meta` column still exists.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1 — Ownership backfill.
-- All legacy rows belong to the single real user. Adjust the email if needed.
-- (You can confirm the id with:  select id, email from auth.users;)
-- ---------------------------------------------------------------------
update public.animes
set user_id = (select id from auth.users where email = 'privatyunus@gmail.com' limit 1)
where user_id is null;

-- ---------------------------------------------------------------------
-- STEP 2 — status  (replaces DEAD / LIMBO / SUPERSEDED magic strings)
-- ---------------------------------------------------------------------
update public.animes set status = 'dead'       where category = 'watched' and meta = 'DEAD';
update public.animes set status = 'limbo'      where category = 'watched' and meta = 'LIMBO';
update public.animes set status = 'superseded' where category = 'watched' and meta = 'SUPERSEDED';
update public.animes set status = 'active'
  where status is null
     or (category = 'watched' and meta not in ('DEAD', 'LIMBO', 'SUPERSEDED'))
     or category in ('current', 'watchlist', 'next-season', 'next_season');

-- ---------------------------------------------------------------------
-- STEP 3 — next_season derivations (format / is_placeholder / release_label /
--          is_released / last_updated_at) parsed from the meta prefix format:
--            "FILM|<label>"  /  "STAFFEL|<label>"  optionally + "|PLACEHOLDER"
--            "UPDATED|<ms>"  => already released
-- ---------------------------------------------------------------------
with parsed as (
  select
    id,
    meta,
    -- strip the FILM|/STAFFEL| prefix, then the |PLACEHOLDER suffix, then TBA markers
    replace(
      replace(
        regexp_replace(coalesce(meta, ''), '^(FILM|STAFFEL)\|', ''),
        '|PLACEHOLDER', ''
      ),
      'TBA_PLACEHOLDER', 'Datum unbekannt'
    ) as cleaned,
    (meta like 'FILM|%')            as is_movie,
    (meta like '%PLACEHOLDER%')     as is_ph,
    (meta like 'UPDATED|%')         as is_updated
  from public.animes
  where category in ('next-season', 'next_season')
)
update public.animes a
set
  format = case
             when p.is_updated then coalesce(a.format, 'season')
             when p.is_movie   then 'movie'::anime_format
             else 'season'::anime_format
           end,
  is_placeholder = p.is_ph,
  is_released = case when p.is_updated then true else a.is_released end,
  last_updated_at = case
                      when p.is_updated
                      then to_timestamp(nullif(split_part(p.meta, '|', 2), '')::bigint / 1000.0)
                      else a.last_updated_at
                    end,
  release_label = case
    when p.is_updated then 'Release online'
    when nullif(trim(p.cleaned), '') is null or p.cleaned in ('unangekündigt')
      then case when p.is_movie then 'Film angekündigt' else 'Fortsetzung angekündigt' end
    when p.cleaned = 'TBA' then 'Datum unbekannt'
    else p.cleaned
  end
from parsed p
where p.id = a.id;

-- ---------------------------------------------------------------------
-- STEP 4 — franchise_meta from the four legacy franchise_* columns.
-- If these columns do not exist in your table, comment this block out.
-- ---------------------------------------------------------------------
update public.animes
set franchise_meta = jsonb_strip_nulls(jsonb_build_object(
  'episodes',  franchise_episodes,
  'seasons',   franchise_seasons,
  'movies',    franchise_movies,
  'specials',  franchise_specials,
  'last_scan', franchise_last_scan
))
where franchise_episodes is not null
   or franchise_seasons  is not null
   or franchise_movies   is not null
   or franchise_specials is not null
   or franchise_last_scan is not null;

-- ---------------------------------------------------------------------
-- STEP 5 — sort_order per (user, category), seeded from created_at.
-- (The old localStorage order yp_watchlist_order / yp_current_order lives only
--  in the browser and cannot be recovered server-side.)
-- ---------------------------------------------------------------------
with ordered as (
  select id,
         row_number() over (partition by user_id, category order by created_at, id) as rn
  from public.animes
)
update public.animes a
set sort_order = o.rn
from ordered o
where o.id = a.id;

-- ---------------------------------------------------------------------
-- STEP 6 — normalize category values and convert the column to the enum type.
-- ---------------------------------------------------------------------
update public.animes set category = 'next_season' where category = 'next-season';

alter table public.animes
  alter column category type anime_category using category::anime_category;

-- ---------------------------------------------------------------------
-- STEP 7 — enforce ownership now that every row has a user_id.
-- (Fails loudly if any row is still null — which means the STEP 1 email was wrong.)
-- ---------------------------------------------------------------------
alter table public.animes alter column user_id set not null;

-- =====================================================================
-- OPTIONAL CLEANUP — run ONLY after you verified everything (see README).
-- This permanently drops the legacy columns. Keep them until you are sure.
-- =====================================================================
-- alter table public.animes drop column if exists meta;
-- alter table public.animes drop column if exists franchise_episodes;
-- alter table public.animes drop column if exists franchise_seasons;
-- alter table public.animes drop column if exists franchise_movies;
-- alter table public.animes drop column if exists franchise_specials;
-- alter table public.animes drop column if exists franchise_last_scan;
