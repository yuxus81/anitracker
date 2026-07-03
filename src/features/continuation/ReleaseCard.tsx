import type { AnimeRow } from '@/types/db';
import { useDetailStore } from '@/features/shared/detailStore';
import { FilmIcon } from '@/components/icons/CategoryIcons';

/**
 * Poster card for a continuation that has become available ("Noch zu schauen").
 * Tapping anywhere opens the context popup, which promotes it into "Am Schauen".
 */
export function ReleaseCard({ anime }: { anime: AnimeRow }) {
  const openRow = useDetailStore((s) => s.openRow);

  return (
    <button
      type="button"
      onClick={() => openRow(anime)}
      aria-label={`Details zu ${anime.title}`}
      className="group hover-lift relative block overflow-hidden rounded-xl2 border border-orange/30 bg-card text-left shadow-card hover:border-orange/60"
    >
      <span className="absolute left-2 top-2 z-10 rounded-md bg-orange px-2 py-0.5 text-[0.65rem] font-extrabold uppercase text-white shadow">
        Neu
      </span>

      <span className="block aspect-[2/3] w-full overflow-hidden bg-black/30">
        {anime.cover_url ? (
          <img
            src={anime.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-white/5 text-muted">
            <FilmIcon className="h-8 w-8" />
          </span>
        )}
      </span>

      <span className="block p-2.5">
        <span className="block truncate text-sm font-bold">{anime.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {anime.release_label ?? 'Verfügbar'}
        </span>
      </span>
    </button>
  );
}
