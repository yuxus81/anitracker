import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { jikanApi } from '@/api/jikan';
import { cleanDiscovery } from '@/utils/clean';
import { useAnimeSearch } from '@/hooks/useSearch';
import { PageHeader } from '@/components/ui/PageHeader';
import { PosterSkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { cn } from '@/utils/cn';
import type { JikanAnime, JikanListResponse } from '@/types/jikan';
import { PosterCard } from './PosterCard';

type SearchType = 'tv' | 'movie' | null;
interface Genre {
  id: number;
  name: string;
}

const CURATED: Array<{ key: string; title: string; run: (s: AbortSignal) => Promise<JikanListResponse> }> = [
  { key: 'airing', title: '🔥 Gerade angesagt', run: (s) => jikanApi.getTop({ filter: 'airing' }, s) },
  { key: 'season', title: '🆕 Neu diese Season', run: (s) => jikanApi.getSeasonNow(1, s) },
  { key: 'top', title: '⭐ Beste Bewertung', run: (s) => jikanApi.getTop({}, s) },
  { key: 'movies', title: '🎬 Top Filme', run: (s) => jikanApi.getTop({ type: 'movie' }, s) },
  { key: 'popular', title: '💜 Am beliebtesten', run: (s) => jikanApi.getTop({ filter: 'bypopularity' }, s) },
];

const GENRES: Genre[] = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Abenteuer' },
  { id: 4, name: 'Comedy' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasy' },
  { id: 14, name: 'Horror' },
  { id: 7, name: 'Mystery' },
  { id: 22, name: 'Romance' },
  { id: 24, name: 'Sci-Fi' },
  { id: 36, name: 'Slice of Life' },
  { id: 30, name: 'Sport' },
  { id: 37, name: 'Supernatural' },
  { id: 40, name: 'Psychologisch' },
  { id: 41, name: 'Thriller' },
];

const TYPES: Array<{ key: SearchType; label: string }> = [
  { key: null, label: 'Alle' },
  { key: 'tv', label: 'Serien' },
  { key: 'movie', label: 'Filme' },
];

export function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>(null);
  const [genre, setGenre] = useState<Genre | null>(null);

  const searching = query.trim().length >= 2;
  const search = useAnimeSearch(query, type);

  return (
    <div className="animate-stagger">
      <PageHeader title="Entdecken" />

      {/* Search */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) setGenre(null);
          }}
          placeholder="Anime oder Film suchen…"
          className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-base text-white outline-none focus:border-accent-purple"
        />
      </div>

      {/* Type filter */}
      <div className="mb-4 flex gap-2">
        {TYPES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setType(t.key)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
              type === t.key
                ? 'border-accent-purple bg-accent-purple/20 text-white'
                : 'border-white/10 bg-white/5 text-muted hover:text-white',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Genre pills */}
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {GENRES.map((g) => {
          const active = genre?.id === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setGenre(active ? null : g);
                setQuery('');
              }}
              className={cn(
                'flex-shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                active
                  ? 'border-accent-neon bg-accent-neon/15 text-accent-neon'
                  : 'border-white/10 bg-white/5 text-muted hover:text-white',
              )}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {searching ? (
        <ResultGrid
          isLoading={search.isLoading}
          isError={search.isError}
          onRetry={() => search.refetch()}
          items={search.data}
          emptyHint="Versuch einen anderen Titel."
        />
      ) : genre ? (
        <GenreResults genre={genre} />
      ) : (
        <>
          {CURATED.map((section) => (
            <DiscoveryRow key={section.key} section={section} />
          ))}
        </>
      )}
    </div>
  );
}

/** One horizontally-scrolling curated row. Fails quietly so one bad row never breaks the page. */
function DiscoveryRow({ section }: { section: (typeof CURATED)[number] }) {
  const q = useQuery({
    queryKey: qk.discovery(section.key, 1, null),
    queryFn: async ({ signal }) => cleanDiscovery((await section.run(signal)).data).slice(0, 16),
  });

  if (q.isError) return null;
  if (!q.isLoading && (q.data?.length ?? 0) === 0) return null;

  return (
    <section className="mb-7">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{section.title}</h3>
      {q.isLoading ? (
        <PosterSkeletonRow />
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {q.data!.map((a) => (
            <div key={a.mal_id} className="w-[130px] flex-shrink-0 snap-start">
              <PosterCard anime={a} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GenreResults({ genre }: { genre: Genre }) {
  const q = useQuery({
    queryKey: qk.discovery('genre', 1, genre.id),
    queryFn: async ({ signal }) => cleanDiscovery((await jikanApi.byGenre(genre.id, 1, signal)).data),
  });
  return (
    <ResultGrid
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={() => q.refetch()}
      items={q.data}
      emptyHint="Für dieses Genre gibt es gerade nichts."
    />
  );
}

function ResultGrid({
  isLoading,
  isError,
  onRetry,
  items,
  emptyHint,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  items: JikanAnime[] | undefined;
  emptyHint: string;
}) {
  if (isError) return <ErrorState onRetry={onRetry} />;
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] w-full rounded-xl2" />
        ))}
      </div>
    );
  }
  if ((items?.length ?? 0) === 0) {
    return <EmptyState title="Nichts gefunden" hint={emptyHint} />;
  }
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {items!.map((a) => (
        <PosterCard key={a.mal_id} anime={a} />
      ))}
    </div>
  );
}
