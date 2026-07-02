import { supabase } from '@/lib/supabase';
import type { AnimeRow, AnimeUpdate, NewAnime } from '@/types/db';

const TABLE = 'animes';

export async function fetchAnimes(): Promise<AnimeRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnimeRow[];
}

export async function insertAnime(anime: NewAnime): Promise<AnimeRow> {
  const { data, error } = await supabase.from(TABLE).insert(anime).select('*').single();
  if (error) throw error;
  return data as AnimeRow;
}

export async function insertManyAnimes(animes: NewAnime[]): Promise<AnimeRow[]> {
  if (animes.length === 0) return [];
  const { data, error } = await supabase.from(TABLE).insert(animes).select('*');
  if (error) throw error;
  return (data ?? []) as AnimeRow[];
}

export async function updateAnime(id: string, patch: AnimeUpdate): Promise<AnimeRow> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as AnimeRow;
}

export async function deleteAnime(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/** Persist a new manual ordering for a set of rows. */
export async function persistOrder(order: Array<{ id: string; sort_order: number }>): Promise<void> {
  // Run updates in parallel; each is a scoped single-row update (RLS-safe).
  const results = await Promise.all(
    order.map((o) => supabase.from(TABLE).update({ sort_order: o.sort_order }).eq('id', o.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Deletes ONLY the current user's rows (RLS enforces this server-side too). */
export async function wipeOwnAnimes(userId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId);
  if (error) throw error;
}
