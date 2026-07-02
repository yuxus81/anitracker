-- =====================================================================
-- 0003_rls.sql
-- Enables Row Level Security so every user can only touch their own rows.
-- Run AFTER 0002 (user_id must be populated and NOT NULL first).
-- =====================================================================

-- ---------- animes ----------
alter table public.animes enable row level security;

drop policy if exists "animes_select_own" on public.animes;
create policy "animes_select_own" on public.animes
  for select using (auth.uid() = user_id);

drop policy if exists "animes_insert_own" on public.animes;
create policy "animes_insert_own" on public.animes
  for insert with check (auth.uid() = user_id);

drop policy if exists "animes_update_own" on public.animes;
create policy "animes_update_own" on public.animes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "animes_delete_own" on public.animes;
create policy "animes_delete_own" on public.animes
  for delete using (auth.uid() = user_id);

-- ---------- push_subscriptions ----------
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
