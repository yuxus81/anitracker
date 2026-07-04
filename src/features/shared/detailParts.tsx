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

/** Small stat tile used for the single-entry (Version 2) stats and fallbacks. */
export function Meta({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-white/5 bg-white/[0.03] p-3', className)}>
      <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="mt-0.5 block font-extrabold">{value}</span>
    </div>
  );
}

export function TileSkeletons({ count }: { count: number }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Version 2 — the single clicked entry. Movies show duration instead of an
 * episode count; everything else shows its episode count.
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
  return (
    <div className="my-4 grid grid-cols-3 gap-2 text-left">
      <Meta label="Score" value={score ? `★ ${score}` : '—'} />
      {isMovie ? (
        <Meta label="Dauer" value={formatDuration(duration)} />
      ) : (
        <Meta label="Folgen" value={episodes ? String(episodes) : '—'} />
      )}
      <Meta label="Typ" value={typeLabel(type, format)} />
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
