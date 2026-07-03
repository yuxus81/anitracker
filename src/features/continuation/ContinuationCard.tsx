import type { AnimeRow } from '@/types/db';
import { FilmIcon } from '@/components/icons/CategoryIcons';

function formatChip(a: AnimeRow): { icon: string; label: string } | null {
  if (a.format === 'movie') return { icon: '🎬', label: 'Film' };
  if (a.format === 'season') return { icon: '📺', label: 'Neue Staffel' };
  return null;
}

/**
 * Purple, glassy, info-forward card for the dedicated "Fortsetzung folgt" grid.
 * Deliberately distinct from the Watchlist poster grid: cover on the left with
 * the release date, format and placeholder state read out beside it.
 */
export function ContinuationCard({
  anime,
  index = 0,
  onOpen,
}: {
  anime: AnimeRow;
  index?: number;
  onOpen: () => void;
}) {
  const fmt = formatChip(anime);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Details zu ${anime.title}`}
      className="stagger-item hover-lift group relative flex gap-3.5 overflow-hidden rounded-xl2 border border-accent-purple/25 bg-accent-purple/[0.06] p-3 text-left shadow-card backdrop-blur-sm transition active:scale-[0.99]"
      style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}
    >
      {/* Soft purple glow bleeding from the corner. */}
      <span
        className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-accent-purple/20 blur-2xl"
        aria-hidden
      />

      {anime.cover_url ? (
        <img
          src={anime.cover_url}
          alt=""
          loading="lazy"
          className="relative h-[104px] w-[72px] flex-shrink-0 rounded-lg object-cover shadow-glow-purple"
        />
      ) : (
        <span className="relative grid h-[104px] w-[72px] flex-shrink-0 place-items-center rounded-lg border border-accent-purple/25 bg-accent-purple/10 text-[#c18eff]">
          <FilmIcon className="h-7 w-7" />
        </span>
      )}

      <div className="relative min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-purple/40 bg-accent-purple/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-[#c18eff]">
          🔮 Fortsetzung folgt
        </span>
        <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug">{anime.title}</p>
        <div className="mt-2 flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-[#c9a6ff]">
            🗓️ {anime.release_label ?? 'Datum unbekannt'}
          </span>
          {fmt && (
            <span className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted">
              {fmt.icon} {fmt.label}
            </span>
          )}
          {anime.is_placeholder && (
            <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5 text-[0.6rem] font-bold text-[#ff5c8a]">
              ⏳ Platzhalter
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
