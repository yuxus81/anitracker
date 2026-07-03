import type { AnimeRow } from '@/types/db';
import { useUpdateAnime } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { toast } from '@/store/ui';
import { FilmIcon } from '@/components/icons/CategoryIcons';

/**
 * Poster card for a continuation that has become available ("Noch zu schauen").
 * Tapping the poster opens details; the CTA promotes it into "Am Schauen".
 */
export function ReleaseCard({ anime }: { anime: AnimeRow }) {
  const openDetail = useDetailStore((s) => s.open);
  const update = useUpdateAnime();

  function startWatching() {
    update.mutate({
      id: anime.id,
      patch: {
        category: 'current',
        status: 'active',
        is_released: false,
        is_placeholder: false,
        sort_order: Date.now(),
      },
    });
    toast.success(`„${anime.title}" ist jetzt in „Am Schauen"`, '▶️');
  }

  return (
    <div className="group hover-lift relative overflow-hidden rounded-xl2 border border-orange/30 bg-card shadow-card hover:border-orange/60">
      <span className="absolute left-2 top-2 z-10 rounded-md bg-orange px-2 py-0.5 text-[0.65rem] font-extrabold uppercase text-white shadow">
        Neu
      </span>

      <button
        type="button"
        onClick={() => anime.mal_id && openDetail(anime.mal_id)}
        disabled={!anime.mal_id}
        aria-label={`Details zu ${anime.title}`}
        className="block aspect-[2/3] w-full overflow-hidden bg-black/30"
      >
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
      </button>

      <div className="p-2.5">
        <p className="truncate text-sm font-bold">{anime.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{anime.release_label ?? 'Verfügbar'}</p>
        <button
          type="button"
          onClick={startWatching}
          className="mt-2 w-full rounded-lg bg-accent-neon/15 py-1.5 text-xs font-bold text-accent-neon transition hover:bg-accent-neon hover:text-bg"
        >
          ▶ Jetzt schauen
        </button>
      </div>
    </div>
  );
}
