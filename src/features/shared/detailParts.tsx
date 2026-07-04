import type { CSSProperties, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';
import { formatBroadcastLocal } from '@/utils/broadcast';
import type { AnimeFormat } from '@/types/db';
import type { JikanBroadcast } from '@/types/jikan';

/**
 * Cyan "now airing" banner. Only rendered when the entry is currently airing;
 * shows the next episode's slot converted from JST to the viewer's local time.
 */
export function AiringBanner({ broadcast }: { broadcast?: JikanBroadcast | null }) {
  const when = formatBroadcastLocal(broadcast);
  return (
    <div className="mt-3 rounded-xl border border-accent-neon/40 bg-accent-neon/10 px-4 py-2.5 text-accent-neon">
      <div className="flex items-center justify-center gap-2 text-sm font-bold">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-neon opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-neon" />
        </span>
        Läuft aktuell
      </div>
      {when && (
        <div className="mt-1 text-center text-xs font-semibold text-accent-neon/80">
          Neue Folge · {when}
        </div>
      )}
    </div>
  );
}

// ---- Shared tile system -----------------------------------------------------
// One bubbly tile shape drives both popup versions. The `tone` carries meaning
// through its glow: cyan = openable, gold = rating, white = plain stat. Only one
// or two tiles glow strongly per popup so the surface never overstimulates.

export type TileTone = 'link' | 'gold' | 'neutral';

const TONES: Record<TileTone, { frame: string; label: string }> = {
  link: {
    frame:
      'border-accent-neon/30 bg-gradient-to-br from-accent-neon/[0.10] via-accent-purple/[0.06] to-transparent shadow-[0_0_24px_-12px_rgba(0,245,212,0.85)]',
    label: 'text-accent-neon/80',
  },
  gold: {
    frame:
      'border-amber-300/30 bg-gradient-to-br from-amber-300/[0.12] via-amber-400/[0.05] to-transparent shadow-[0_0_22px_-13px_rgba(251,191,36,0.75)]',
    label: 'text-amber-200/85',
  },
  neutral: {
    frame:
      'border-white/[0.09] bg-gradient-to-br from-white/[0.05] to-white/[0.01] shadow-[0_0_18px_-15px_rgba(255,255,255,0.6)]',
    label: 'text-muted',
  },
};

/** A quiet stat tile (no interaction). Value size defaults to the big display size. */
export function StatTile({
  label,
  value,
  tone = 'neutral',
  valueClass = 'text-[1.6rem] leading-none',
  className,
  style,
}: {
  label: string;
  value: ReactNode;
  tone?: TileTone;
  valueClass?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const t = TONES[tone];
  return (
    <div style={style} className={cn('rounded-xl2 border p-3.5 text-left', t.frame, className)}>
      <span className={cn('block text-[0.65rem] font-bold uppercase tracking-widest', t.label)}>
        {label}
      </span>
      <span className={cn('mt-1 block font-extrabold text-ink', valueClass)}>{value}</span>
    </div>
  );
}

/** A clickable tile that drills into a sub-level. Cyan by default. */
export function LinkTile({
  label,
  value,
  tone = 'link',
  onClick,
  className,
  style,
}: {
  label: string;
  value: ReactNode;
  tone?: TileTone;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'hover-lift hover-press group relative rounded-xl2 border p-3.5 text-left transition-colors hover:border-accent-neon/60',
        t.frame,
        className,
      )}
    >
      <span className={cn('block text-[0.65rem] font-bold uppercase tracking-widest', t.label)}>
        {label}
      </span>
      <span className="mt-1 block text-[1.6rem] font-extrabold leading-none text-ink">{value}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-3.5 text-accent-neon/70 transition-transform group-hover:translate-x-0.5"
      >
        ›
      </span>
    </button>
  );
}

/** Rating value with a gold star, shared by both popup versions. */
export function ScoreValue({ score }: { score: number | null }) {
  if (score == null) return <>—</>;
  return (
    <>
      <span className="text-amber-300">★</span> {score}
    </>
  );
}

export function TileSkeletons({ count }: { count: number }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[4.5rem] rounded-xl2" />
      ))}
    </div>
  );
}

/**
 * Version 2 — the single clicked entry. Movies show duration instead of an
 * episode count; everything else shows its episode count. Uses the same bubbly
 * tiles as the franchise overview, sized to fit three across.
 */
export function EntryStats({
  score,
  episodes,
  duration,
  type,
  format = null,
}: {
  score: number | null;
  episodes: number | null;
  duration: string | null;
  type: string | null;
  format?: AnimeFormat | null;
}) {
  const isMovie = format === 'movie' || (type ?? '').toLowerCase() === 'movie';
  const compact = 'text-lg leading-tight';
  return (
    <div className="my-4 grid grid-cols-3 gap-2.5">
      <StatTile label="Score" tone="gold" valueClass={compact} value={<ScoreValue score={score} />} />
      {isMovie ? (
        <StatTile label="Dauer" valueClass={compact} value={formatDuration(duration)} />
      ) : (
        <StatTile label="Folgen" valueClass={compact} value={episodes ? String(episodes) : '—'} />
      )}
      <StatTile label="Typ" valueClass={compact} value={typeLabel(type, format)} />
    </div>
  );
}

export function formatLabel(format: AnimeFormat): string {
  return format === 'movie' ? 'Film' : format === 'season' ? 'Staffel' : 'Abgeschlossen';
}

/** Maps a Jikan type (falling back to the stored format) to a German label. */
export function typeLabel(type: string | null | undefined, format: AnimeFormat | null): string {
  switch ((type ?? '').toLowerCase()) {
    case 'tv':
      return 'Staffel';
    case 'movie':
      return 'Film';
    case 'ova':
      return 'OVA';
    case 'ona':
      return 'ONA';
    case 'special':
    case 'tv special':
      return 'Special';
    case 'music':
      return 'Music';
  }
  return format ? formatLabel(format) : '—';
}

/** Tidies Jikan's duration string ("1 hr 47 min per ep") into German. */
export function formatDuration(duration: string | null | undefined): string {
  if (!duration) return '—';
  const cleaned = duration
    .replace(/per ep/i, '')
    .replace(/\bhr\b/i, 'Std.')
    .replace(/\bmin\b/i, 'Min.')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || '—';
}
