import type { AnimeRow } from '@/types/db';
import { Button } from '@/components/ui/Button';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';

/**
 * Horizontal "now watching" ticket with a neon edge. The primary action
 * ("Abschließen") hands the series to the franchise timeline scanner, which
 * decides where it goes next (watched + the following season as next_season).
 */
export function NeonTicket({ anime }: { anime: AnimeRow }) {
  const openFranchise = useFranchiseStore((s) => s.open);

  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-xl2 border border-accent-neon/25 bg-gradient-to-r from-accent-neon/[0.08] to-transparent p-3 shadow-card">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent-neon" />

      {anime.cover_url ? (
        <img
          src={anime.cover_url}
          alt=""
          loading="lazy"
          className="h-[84px] w-[58px] flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="grid h-[84px] w-[58px] flex-shrink-0 place-items-center rounded-lg bg-white/5 text-xl">
          🎬
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold leading-tight">{anime.title}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent-neon">▶ Läuft</p>
      </div>

      <Button
        variant="neon"
        size="sm"
        onClick={() =>
          openFranchise({
            malId: anime.mal_id,
            title: anime.title,
            coverUrl: anime.cover_url,
            existingId: anime.id,
          })
        }
      >
        Abschließen
      </Button>
    </div>
  );
}
