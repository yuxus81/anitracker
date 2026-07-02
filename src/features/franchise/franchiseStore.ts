import { create } from 'zustand';

/** Seed data for launching the franchise timeline scanner. */
export interface FranchiseSeed {
  malId: number | null;
  title: string;
  coverUrl: string | null;
  /** If we are "finishing" an existing tracked row (e.g. a current series). */
  existingId?: string;
}

interface FranchiseState {
  seed: FranchiseSeed | null;
  open: (seed: FranchiseSeed) => void;
  close: () => void;
}

export const useFranchiseStore = create<FranchiseState>((set) => ({
  seed: null,
  open: (seed) => set({ seed }),
  close: () => set({ seed: null }),
}));
