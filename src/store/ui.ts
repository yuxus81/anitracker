import { create } from 'zustand';
import type { AnimeCategory } from '@/types/db';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  icon?: string;
}

interface UIState {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, icon?: string) => void;
  dismissToast: (id: number) => void;

  /** Global "add anime" modal. `preset` seeds the target list (null = let user choose). */
  addModalOpen: boolean;
  addModalPreset: AnimeCategory | null;
  openAddModal: (preset?: AnimeCategory | null) => void;
  closeAddModal: () => void;
}

let toastSeq = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addModalOpen: false,
  addModalPreset: null,
  openAddModal: (preset = null) => set({ addModalOpen: true, addModalPreset: preset }),
  closeAddModal: () => set({ addModalOpen: false }),
  addToast: (message, variant = 'default', icon) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, icon }] }));
    // Auto-dismiss after 3.2s.
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helpers usable outside React components (e.g. mutation callbacks). */
export const toast = {
  success: (msg: string, icon = '✅') => useUIStore.getState().addToast(msg, 'success', icon),
  error: (msg: string, icon = '⚠️') => useUIStore.getState().addToast(msg, 'error', icon),
  info: (msg: string, icon = 'ℹ️') => useUIStore.getState().addToast(msg, 'info', icon),
  show: (msg: string, icon?: string) => useUIStore.getState().addToast(msg, 'default', icon),
};
