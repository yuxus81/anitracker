import { create } from 'zustand';
import type { AnimeRow } from '@/types/db';
import type { PopupAtmosphere } from '@/components/ui/ParticleField';

interface DetailState {
  /** Discovery mode: a Jikan id from search/discover results (may not be tracked). */
  malId: number | null;
  /** Library mode: a tracked row from the collection (works even without a mal_id). */
  row: AnimeRow | null;
  /** Optional themed particle motif for the popup (e.g. genre-tinted in Discover). */
  atmosphere: PopupAtmosphere | null;
  /** Open by Jikan id — used by discovery/search posters. */
  open: (malId: number, atmosphere?: PopupAtmosphere | null) => void;
  /** Open a tracked library entry with full context + context-aware actions. */
  openRow: (row: AnimeRow) => void;
  close: () => void;
}

/**
 * Controls the global anime detail modal. Two entry points:
 * - `open(malId, atmosphere?)` for discovery results (add-to-collection actions),
 *   optionally carrying a genre-themed particle motif for the popup.
 * - `openRow(row)` for any tracked entry (category-aware actions), which works
 *   even for rows without a mal_id.
 */
export const useDetailStore = create<DetailState>((set) => ({
  malId: null,
  row: null,
  atmosphere: null,
  open: (malId, atmosphere = null) => set({ malId, row: null, atmosphere }),
  openRow: (row) => set({ row, malId: null, atmosphere: null }),
  close: () => set({ malId: null, row: null, atmosphere: null }),
}));
