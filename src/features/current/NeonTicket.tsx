import type { AnimeRow } from '@/types/db';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { PlayGlyph } from '@/components/icons/CategoryIcons';

/**
 * Horizontal "now watching" ticket: a dark interior framed by a neon edge and
 * glow. The round play button hands the series to the franchise timeline
 * scanner ("Abschließen"), which decides where it goes next (watched + the
 * following season as next_season).
 */
export function NeonTicket({ anime }: { anime: AnimeRow }) {
  const openFranchise = useFranchiseStore((s) => s.open);

  return (
    <div className="hover-lift flex items-center gap-4 rounded-xl2 border-[1.5px] border-accent-neon/55 bg-[#0a0c12] p-3 shadow-glow-neon hover:border-accent-neon">
      {anime.cover_url ? (
        <img
          src={anime.cover_url}
          alt=""
          loading="lazy"
          className="h-[84px] w-[58px] flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="grid h-[84px] w-[58px] flex-shrink-0 place-items-center rounded-lg bg-white/5 text-accent-neon">
          <PlayGlyph className="h-6 w-6" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold leading-tight">{anime.title}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent-neon">▶ Läuft</p>
      </div>

      <button
        type="button"
        title="Staffel abschließen"
        aria-label={`„${anime.title}" abschließen`}
        onClick={() =>
          openFranchise({
            malId: anime.mal_id,
            title: anime.title,
            coverUrl: anime.cover_url,
            existingId: anime.id,
          })
        }
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full border-[1.5px] border-accent-neon/60 bg-accent-neon/10 text-accent-neon transition hover:bg-accent-neon hover:text-bg active:scale-95"
      >
        <PlayGlyph className="ml-0.5 h-5 w-5" />
      </button>
    </div>
  );
}
