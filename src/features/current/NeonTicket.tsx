import type { AnimeRow } from '@/types/db';
import { useDetailStore } from '@/features/shared/detailStore';
import { PlayGlyph } from '@/components/icons/CategoryIcons';

/**
 * Horizontal "now watching" ticket: a dark interior framed by a neon edge and
 * glow. Tapping anywhere opens the context popup, where "Abschließen" hands the
 * series to the franchise timeline scanner.
 */
export function NeonTicket({ anime }: { anime: AnimeRow }) {
  const openRow = useDetailStore((s) => s.openRow);

  return (
    <button
      type="button"
      onClick={() => openRow(anime)}
      aria-label={`Details zu ${anime.title}`}
      className="hover-lift flex w-full items-center gap-4 rounded-xl2 border-[1.5px] border-accent-neon/55 bg-[#0a0c12] p-3.5 text-left shadow-glow-neon hover:border-accent-neon"
    >
      {anime.cover_url ? (
        <img
          src={anime.cover_url}
          alt=""
          loading="lazy"
          className="h-[150px] w-[105px] flex-shrink-0 rounded-xl object-cover shadow-card"
        />
      ) : (
        <span className="grid h-[150px] w-[105px] flex-shrink-0 place-items-center rounded-xl bg-white/5 text-accent-neon">
          <PlayGlyph className="h-9 w-9" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-lg font-bold leading-snug">{anime.title}</span>
        <span className="mt-1.5 block text-xs font-bold uppercase tracking-wide text-accent-neon">
          ▶ Läuft
        </span>
      </span>

      <span className="flex-shrink-0 pr-1 text-2xl text-accent-neon/50" aria-hidden>
        ›
      </span>
    </button>
  );
}
