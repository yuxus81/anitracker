import { create } from 'zustand';

interface DetailState {
  malId: number | null;
  open: (malId: number) => void;
  close: () => void;
}

/** Controls the global anime detail modal (opened from discovery/search cards). */
export const useDetailStore = create<DetailState>((set) => ({
  malId: null,
  open: (malId) => set({ malId }),
  close: () => set({ malId: null }),
}));
