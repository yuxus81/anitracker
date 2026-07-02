import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import {
  deleteAnime,
  fetchAnimes,
  insertAnime,
  persistOrder,
  updateAnime,
} from '@/api/animes';
import type { AnimeRow, AnimeUpdate, NewAnime } from '@/types/db';
import { toast } from '@/store/ui';

export function useAnimesQuery() {
  return useQuery({ queryKey: qk.animes, queryFn: fetchAnimes });
}

export interface GroupedAnimes {
  all: AnimeRow[];
  watched: AnimeRow[]; // visible watched (superseded hidden)
  current: AnimeRow[];
  watchlist: AnimeRow[];
  nextSeason: AnimeRow[];
  counts: { watched: number; current: number; nextSeason: number; watchlist: number };
}

export function groupAnimes(rows: AnimeRow[]): GroupedAnimes {
  const byOrder = (a: AnimeRow, b: AnimeRow) =>
    (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER);

  const watchedAll = rows.filter((r) => r.category === 'watched');
  const watched = watchedAll.filter((r) => r.status !== 'superseded').sort(byOrder);
  const current = rows.filter((r) => r.category === 'current').sort(byOrder);
  const watchlist = rows.filter((r) => r.category === 'watchlist').sort(byOrder);
  const nextSeason = rows.filter((r) => r.category === 'next_season').sort(byOrder);

  return {
    all: rows,
    watched,
    current,
    watchlist,
    nextSeason,
    counts: {
      watched: watched.length,
      current: current.length,
      nextSeason: nextSeason.length,
      watchlist: watchlist.length,
    },
  };
}

export function useGroupedAnimes() {
  const query = useAnimesQuery();
  const grouped = useMemo(() => groupAnimes(query.data ?? []), [query.data]);
  return { ...query, grouped };
}

// ---- Optimistic mutation helpers -------------------------------------------

function snapshot(qc: QueryClient) {
  return qc.getQueryData<AnimeRow[]>(qk.animes) ?? [];
}

export function useAddAnime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (anime: NewAnime) => insertAnime(anime),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.animes }),
    onError: (err) => {
      console.error('[addAnime]', err);
      toast.error('Konnte nicht hinzugefügt werden.');
    },
  });
}

export function useUpdateAnime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AnimeUpdate }) => updateAnime(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.animes });
      const previous = snapshot(qc);
      qc.setQueryData<AnimeRow[]>(qk.animes, (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      console.error('[updateAnime]', err);
      if (ctx?.previous) qc.setQueryData(qk.animes, ctx.previous);
      toast.error('Änderung fehlgeschlagen.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.animes }),
  });
}

export function useDeleteAnime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnime(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.animes });
      const previous = snapshot(qc);
      qc.setQueryData<AnimeRow[]>(qk.animes, (old) => (old ?? []).filter((r) => r.id !== id));
      return { previous };
    },
    onError: (err, _id, ctx) => {
      console.error('[deleteAnime]', err);
      if (ctx?.previous) qc.setQueryData(qk.animes, ctx.previous);
      toast.error('Löschen fehlgeschlagen.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.animes }),
  });
}

/** Reorder within a category. Applies optimistically, persists sort_order in DB. */
export function useReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: Array<{ id: string; sort_order: number }>) => persistOrder(order),
    onMutate: async (order) => {
      await qc.cancelQueries({ queryKey: qk.animes });
      const previous = snapshot(qc);
      const map = new Map(order.map((o) => [o.id, o.sort_order]));
      qc.setQueryData<AnimeRow[]>(qk.animes, (old) =>
        (old ?? []).map((r) => (map.has(r.id) ? { ...r, sort_order: map.get(r.id)! } : r)),
      );
      return { previous };
    },
    onError: (err, _order, ctx) => {
      console.error('[reorder]', err);
      if (ctx?.previous) qc.setQueryData(qk.animes, ctx.previous);
      toast.error('Reihenfolge konnte nicht gespeichert werden.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.animes }),
  });
}
