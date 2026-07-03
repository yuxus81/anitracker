import { useMemo, useState, type CSSProperties } from 'react';
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

/**
 * Trimmed to the genres people actually browse by. Niche moods (Horror, Sci-Fi,
 * Mystery, Supernatural, Psychological, Thriller, Slice of Life) were removed to
 * keep the pill row scannable.
 */
const GENRES: Genre[] = [
  { id: 1, name: 'Action' },
  { id: 2, name: 'Abenteuer' },
  { id: 10, name: 'Fantasy' },
  { id: 22, name: 'Romance' },
  { id: 30, name: 'Sport' },
  { id: 8, name: 'Drama' },
];

const TYPES: Array<{ key: SearchType; label: string }> = [
  { key: null, label: 'Alle' },
  { key: 'tv', label: 'Serien' },
  { key: 'movie', label: 'Filme' },
];

// ---- Per-genre atmosphere -------------------------------------------------

type ParticleShape = 'heart' | 'star' | 'orb';

interface GenreTheme {
  /** Full-bleed background wash painted behind the page content. */
  gradient: string;
  /** Colour of the drifting particles + their soft glow. */
  particleColor: string;
  shape: ParticleShape;
  /** Static Tailwind classes for the active pill (JIT-safe literals). */
  pill: string;
}

const GENRE_THEME: Record<number, GenreTheme> = {
  // Action — ember red
  1: {
    gradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(255,64,48,0.20), transparent 55%), linear-gradient(180deg, rgba(255,0,60,0.10), transparent 42%)',
    particleColor: '#ff7043',
    shape: 'orb',
    pill: 'border-[#ff7043] bg-[#ff7043]/15 text-[#ff7043]',
  },
  // Abenteuer — emerald
  2: {
    gradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(46,204,113,0.20), transparent 55%), linear-gradient(180deg, rgba(16,150,90,0.10), transparent 42%)',
    particleColor: '#48d597',
    shape: 'orb',
    pill: 'border-[#48d597] bg-[#48d597]/15 text-[#48d597]',
  },
  // Fantasy — violet sparkle
  10: {
    gradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(138,43,226,0.24), transparent 55%), linear-gradient(180deg, rgba(90,40,200,0.12), transparent 42%)',
    particleColor: '#c9a8ff',
    shape: 'star',
    pill: 'border-[#c9a8ff] bg-[#c9a8ff]/15 text-[#c9a8ff]',
  },
  // Romance — rose hearts
  22: {
    gradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(255,60,120,0.24), transparent 55%), linear-gradient(180deg, rgba(214,20,90,0.13), transparent 42%)',
    particleColor: '#ff5c8a',
    shape: 'heart',
    pill: 'border-[#ff5c8a] bg-[#ff5c8a]/15 text-[#ff5c8a]',
  },
  // Sport — electric blue
  30: {
    gradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(58,134,255,0.20), transparent 55%), linear-gradient(180deg, rgba(0,180,220,0.10), transparent 42%)',
    particleColor: '#5ad1ff',
    shape: 'orb',
    pill: 'border-[#5ad1ff] bg-[#5ad1ff]/15 text-[#5ad1ff]',
  },
  // Drama — warm theatrical amber-gold
  8: {
    gradient:
      'radial-gradient(120% 75% at 50% 0%, rgba(255,190,60,0.20), transparent 55%), linear-gradient(180deg, rgba(240,160,20,0.10), transparent 42%)',
    particleColor: '#ffcf5c',
    shape: 'orb',
    pill: 'border-[#ffcf5c] bg-[#ffcf5c]/15 text-[#ffcf5c]',
  },
};

interface ParticleSpec {
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rot: number;
}

function ParticleGlyph({ shape, color, size }: { shape: ParticleShape; color: string; size: number }) {
  if (shape === 'heart') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 21s-7.4-4.6-9.9-9C.8 8.7 2.3 5.2 5.6 5.2c2 0 3.4 1.2 4 2.4.6-1.2 2-2.4 4-2.4 3.3 0 4.8 3.5 3.5 6.8-2.5 4.4-9.1 8.8-9.1 8.8z" />
      </svg>
    );
  }
  if (shape === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 2c.5 4.8 2.2 6.5 7 7-4.8.5-6.5 2.2-7 7-.5-4.8-2.2-6.5-7-7 4.8-.5 6.5-2.2 7-7z" />
      </svg>
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      className="block rounded-full"
    />
  );
}

/**
 * Full-bleed wash + drifting particle field for a themed genre page. Rendered as
 * the backmost layer inside the (transparent, transform-positioned) page root, so
 * it composites over the app background while the content sits above it at z-10.
 * Inert (pointer-events-none) and hidden entirely under prefers-reduced-motion.
 */
function GenreAtmosphere({ theme }: { theme: GenreTheme }) {
  const particles = useMemo<ParticleSpec[]>(() => {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: 16 }, () => {
      const duration = rnd(8, 15);
      return {
        left: rnd(2, 96),
        size: rnd(10, 26),
        duration,
        delay: -rnd(0, duration), // negative → already mid-flight on mount
        opacity: rnd(0.12, 0.32),
        rot: rnd(-14, 14),
      };
    });
    // Regenerate the field whenever the genre (its colour) changes.
  }, [theme.particleColor]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:hidden">
      <div className="absolute inset-0" style={{ background: theme.gradient }} />
      {particles.map((p, i) => (
        <span
          key={i}
          className="genre-particle"
          style={
            {
              left: `${p.left}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              filter: `drop-shadow(0 0 6px ${theme.particleColor})`,
              '--p-opacity': p.opacity,
              '--p-rot': `${p.rot}deg`,
            } as CSSProperties
          }
        >
          <ParticleGlyph shape={theme.shape} color={theme.particleColor} size={p.size} />
        </span>
      ))}
    </div>
  );
}

// ---- Page -----------------------------------------------------------------

export function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>(null);
  const [genre, setGenre] = useState<Genre | null>(null);

  const searching = query.trim().length >= 2;
  const search = useAnimeSearch(query, type);
  const genreTheme = genre ? GENRE_THEME[genre.id] : null;

  return (
    <div className="animate-stagger relative">
      {genreTheme && <GenreAtmosphere theme={genreTheme} />}

      <div className="relative z-10">
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
                    ? GENRE_THEME[g.id]?.pill
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
          <GenreView genre={genre} type={type} />
        ) : type ? (
          <TypeBrowse type={type} />
        ) : (
          <>
            {CURATED.map((section) => (
              <DiscoveryRowFromCurated key={section.key} section={section} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** One horizontally-scrolling row backed by any Jikan query. */
function DiscoveryRow({
  title,
  queryKey,
  run,
}: {
  title: string;
  queryKey: readonly unknown[];
  run: (s: AbortSignal) => Promise<JikanListResponse>;
}) {
  const q = useQuery({
    queryKey,
    queryFn: async ({ signal }) => cleanDiscovery((await run(signal)).data).slice(0, 16),
  });

  if (q.isError) return null;
  if (!q.isLoading && (q.data?.length ?? 0) === 0) return null;

  return (
    <section className="mb-7">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
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

// Type-aware wrapper for the default curated rows.
function DiscoveryRowFromCurated({ section }: { section: (typeof CURATED)[number] }) {
  return (
    <DiscoveryRow title={section.title} queryKey={qk.discovery(section.key, 1, null)} run={section.run} />
  );
}

/** Categorised, themed browse for one genre — mirrors the main "all" layout. */
function GenreView({ genre, type }: { genre: Genre; type: SearchType }) {
  const rows: Array<{
    key: string;
    title: string;
    opts: Parameters<typeof jikanApi.byGenre>[1];
  }> = [
    { key: 'popular', title: '🔥 Beliebt', opts: { orderBy: 'members' } },
    { key: 'top', title: '⭐ Beste Bewertung', opts: { orderBy: 'score' } },
    { key: 'new', title: '🆕 Neueste', opts: { orderBy: 'start_date' } },
  ];

  return (
    <div>
      {rows.map((row) => (
        <DiscoveryRow
          key={row.key}
          title={row.title}
          queryKey={['discovery', `genre-${row.key}`, genre.id, type]}
          run={(s) => jikanApi.byGenre(genre.id, { ...row.opts, type: type ?? undefined }, s)}
        />
      ))}
    </div>
  );
}

/** Full grid of top anime for a single type (Serien / Filme). */
function TypeBrowse({ type }: { type: SearchType }) {
  const q = useQuery({
    queryKey: ['discovery', 'type-top', type],
    queryFn: async ({ signal }) =>
      cleanDiscovery((await jikanApi.getTop({ type: type ?? undefined }, signal)).data),
  });
  return (
    <ResultGrid
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={() => q.refetch()}
      items={q.data}
      emptyHint="Gerade nichts gefunden."
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
