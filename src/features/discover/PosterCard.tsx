import type { JikanAnime } from '@/types/jikan';
import { getBestTitle, getCover } from '@/utils/titles';
import { useDetailStore } from '@/features/shared/detailStore';
import type { PopupAtmosphere } from '@/components/ui/ParticleField';

/** Clickable poster for a Jikan discovery result. Opens the detail modal. */
export function PosterCard({ anime, atmosphere }: { anime: JikanAnime; atmosphere?: PopupAtmosphere }) {
  const openDetail = useDetailStore((s) => s.open);
  const cover = getCover(anime);

  return (
    <button
      type="button"
      onClick={() => openDetail(anime.mal_id, atmosphere)}
      className="group block w-full text-left"
      aria-label={`Details zu ${getBestTitle(anime)}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl2 bg-black/30 shadow-card">
        {cover && (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        {anime.score ? (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[0.65rem] font-bold text-accent-neon">
            ★ {anime.score}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-ink/90">
        {getBestTitle(anime)}
      </p>
    </button>
  );
}
