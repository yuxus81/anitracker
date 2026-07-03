import { create } from 'zustand';
import type { AnimeRow } from '@/types/db';

interface DetailState {
  /** Discovery mode: a Jikan id from search/discover results (may not be tracked). */
  malId: number | null;
  /** Library mode: a tracked row from the collection (works even without a mal_id). */
  row: AnimeRow | null;
  /** Open by Jikan id — used by discovery/search posters. */
  open: (malId: number) => void;
  /** Open a tracked library entry with full context + context-aware actions. */
  openRow: (row: AnimeRow) => void;
  close: () => void;
}

/**
 * Controls the global anime detail modal. Two entry points:
 * - `open(malId)` for discovery results (add-to-collection actions)
 * - `openRow(row)` for any tracked entry (category-aware actions), which works
 *   even for rows without a mal_id.
 */
export const useDetailStore = create<DetailState>((set) => ({
  malId: null,
  row: null,
  open: (malId) => set({ malId, row: null }),
  openRow: (row) => set({ row, malId: null }),
  close: () => set({ malId: null, row: null }),
}));
