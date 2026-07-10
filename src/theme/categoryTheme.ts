import type { AnimeRow } from '@/types/db';
import type { PopupAtmosphere } from '@/components/ui/ParticleField';

export type CategoryKey =
  | 'gesehen'
  | 'suchtNeuigkeiten'
  | 'fortsetzung'
  | 'neuerscheinung'
  | 'watchlist'
  | 'aktuell';

export interface CategoryTheme {
  key: CategoryKey;
  label: string;
  /** Raw accent used for the body glow and inline needs. */
  accentHex: string;
  /** Tailwind text-color class for headings/labels. */
  text: string;
  /** Tailwind bg-color class for the solid accent bar. */
  bar: string;
  /** Tailwind bg-color class for the small header dot. */
  dot: string;
  /** Chip classes: text + border + faint fill. */
  chip: string;
  /** Card tint: faint fill + colored hairline. */
  tint: string;
}

/**
 * Single source of truth for category identity colors. Every value is a static
 * Tailwind class string so the JIT compiler picks it up — never build these
 * dynamically. Components read from here instead of hard-coding hex values.
 */
export const categoryTheme: Record<CategoryKey, CategoryTheme> = {
  gesehen: {
    key: 'gesehen',
    label: 'Gesehen',
    accentHex: '#2ecc71',
    text: 'text-green',
    bar: 'bg-green',
    dot: 'bg-green',
    chip: 'text-green border-green/40 bg-green/10',
    tint: 'bg-green/[0.09] border-green/35',
  },
  suchtNeuigkeiten: {
    key: 'suchtNeuigkeiten',
    label: 'Sucht Neuigkeiten',
    accentHex: '#00f5d4',
    text: 'text-accent-neon',
    bar: 'bg-accent-neon',
    dot: 'bg-accent-neon',
    chip: 'text-accent-neon border-accent-neon/40 bg-accent-neon/10',
    tint: 'bg-accent-neon/[0.09] border-accent-neon/35',
  },
  fortsetzung: {
    key: 'fortsetzung',
    label: 'Fortsetzung folgt',
    accentHex: '#8a2be2',
    text: 'text-[#b388ff]',
    bar: 'bg-accent-purple',
    dot: 'bg-accent-purple',
    chip: 'text-[#c18eff] border-accent-purple/40 bg-accent-purple/10',
    tint: 'bg-accent-purple/[0.10] border-accent-purple/35',
  },
  neuerscheinung: {
    key: 'neuerscheinung',
    label: 'Neuerscheinungen',
    accentHex: '#ff0055',
    text: 'text-[#ff5c8a]',
    bar: 'bg-orange',
    dot: 'bg-orange',
    chip: 'text-[#ff5c8a] border-orange/40 bg-orange/10',
    tint: 'bg-orange/[0.10] border-orange/35',
  },
  watchlist: {
    key: 'watchlist',
    label: 'Watchlist',
    accentHex: '#3a86ff',
    text: 'text-blue',
    bar: 'bg-blue',
    dot: 'bg-blue',
    chip: 'text-blue border-blue/40 bg-blue/10',
    tint: 'bg-blue/[0.09] border-blue/35',
  },
  aktuell: {
    key: 'aktuell',
    label: 'Am Schauen',
    accentHex: '#00f5d4',
    text: 'text-accent-neon',
    bar: 'bg-accent-neon',
    dot: 'bg-accent-neon',
    chip: 'text-accent-neon border-accent-neon/40 bg-accent-neon/10',
    tint: 'bg-accent-neon/[0.09] border-accent-neon/35',
  },
};

/**
 * Maps a stored library row to its identity color key. This is the single place
 * that translates the data model (category + status + release flag) into a
 * visual theme, so cards, badges and the detail popup all agree on the color.
 */
export function categoryKeyForRow(row: AnimeRow): CategoryKey {
  switch (row.category) {
    case 'watched':
      return row.status === 'limbo' ? 'suchtNeuigkeiten' : 'gesehen';
    case 'next_season':
      return row.is_released ? 'neuerscheinung' : 'fortsetzung';
    case 'watchlist':
      return 'watchlist';
    case 'current':
      return 'aktuell';
  }
}

/** Convenience: the full theme object for a row. */
export function themeForRow(row: AnimeRow): CategoryTheme {
  return categoryTheme[categoryKeyForRow(row)];
}

/**
 * Ambient particle motif per category, painted faintly behind the detail popup.
 * Deliberately reads off the same identity colors: green sparkles for watched,
 * purple crystal-stars for continuations, ember orbs for fresh releases, etc.
 */
export const categoryAtmosphere: Record<CategoryKey, PopupAtmosphere> = {
  gesehen: { color: '#2ecc71', shape: 'star' },
  suchtNeuigkeiten: { color: '#00f5d4', shape: 'orb' },
  fortsetzung: { color: '#c18eff', shape: 'star' },
  neuerscheinung: { color: '#ff5c8a', shape: 'orb' },
  watchlist: { color: '#3a86ff', shape: 'orb' },
  aktuell: { color: '#00f5d4', shape: 'orb' },
};

/** Convenience: the popup atmosphere motif for a row. */
export function atmosphereForRow(row: AnimeRow): PopupAtmosphere {
  return categoryAtmosphere[categoryKeyForRow(row)];
}
