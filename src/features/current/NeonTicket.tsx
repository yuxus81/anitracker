import type { AnimeRow } from '@/types/db';
import { useDetailStore } from '@/features/shared/detailStore';
import { PlayGlyph } from '@/components/icons/CategoryIcons';
import { cn } from '@/utils/cn';

/**
 * Horizontal "now watching" ticket: a dark interior framed by a neon edge and
 * glow. Tapping anywhere opens the context popup, where "Abschließen" hands the
 * series to the franchise timeline scanner.
 *
 * `compact` renders the smaller home-screen variant; the dedicated "Am Schauen"
 * page uses the full size (the enlargement was only ever meant for that page).
 */
export function NeonTicket({ anime, compact = false }: { anime: AnimeRow; compact?: boolean }) {
  const openRow = useDetailStore((s) => s.openRow);
  const coverCls = compact ? 'h-[84px] w-[58px]' : 'h-[128px] w-[90px]';

  return (
    <button
      type="button"
      onClick={() => openRow(anime)}
      aria-label={`Details zu ${anime.title}`}
      className={cn(
        'hover-lift flex w-full items-center rounded-xl2 border-[1.5px] border-accent-neon/55 bg-[#0a0c12] text-left shadow-glow-neon hover:border-accent-neon',
        compact ? 'gap-3 p-2.5' : 'gap-3.5 p-3',
      )}
    >
      {anime.cover_url ? (
        <img
          src={anime.cover_url}
          alt=""
          loading="lazy"
          className={cn('flex-shrink-0 rounded-xl object-cover shadow-card', coverCls)}
        />
      ) : (
        <span
          className={cn('grid flex-shrink-0 place-items-center rounded-xl bg-white/5 text-accent-neon', coverCls)}
        >
          <PlayGlyph className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className={cn('line-clamp-2 block font-bold leading-snug', compact ? 'text-sm' : 'text-base')}>
          {anime.title}
        </span>
        <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-accent-neon">
          ▶ Läuft
        </span>
      </span>

      <span className={cn('flex-shrink-0 pr-1 text-accent-neon/50', compact ? 'text-lg' : 'text-xl')} aria-hidden>
        ›
      </span>
    </button>
  );
}
