import type { JikanAnime } from '@/types/jikan';
import { jikanApi } from '@/api/jikan';
import { anilistFallback } from '@/api/anilist';
import { fetchListResilient } from '@/lib/listCache';

/**
 * Outage-proof discovery/search fetchers. Each function pairs the primary
 * Jikan query with its AniList equivalent and routes both through the
 * persistent list cache (see lib/listCache.ts for the full fallback order).
 * The Entdecken page and the search hook consume ONLY these — never raw
 * jikanApi — so a Jikan outage can no longer surface as an error there.
 */

export function fetchTop(
  opts: { type?: 'tv' | 'movie'; filter?: 'bypopularity' | 'favorite' | 'airing'; page?: number },
  signal?: AbortSignal,
): Promise<JikanAnime[]> {
  const key = `top:${opts.type ?? 'all'}:${opts.filter ?? 'rank'}:${opts.page ?? 1}`;
  return fetchListResilient(
    key,
    async (s) => (await jikanApi.getTop(opts, s)).data,
    (s) => anilistFallback.top(opts, s),
    signal,
  );
}

export function fetchSeasonNow(page = 1, signal?: AbortSignal): Promise<JikanAnime[]> {
  return fetchListResilient(
    `season-now:${page}`,
    async (s) => (await jikanApi.getSeasonNow(page, s)).data,
    (s) => anilistFallback.seasonNow(page, s),
    signal,
  );
}

export function fetchByGenre(
  genreId: number,
  opts: {
    page?: number;
    orderBy?: 'members' | 'score' | 'start_date';
    sort?: 'asc' | 'desc';
    status?: 'airing' | 'complete' | 'upcoming';
    type?: 'tv' | 'movie';
  } = {},
  signal?: AbortSignal,
): Promise<JikanAnime[]> {
  const key = `genre:${genreId}:${opts.orderBy ?? 'members'}:${opts.type ?? 'all'}:${opts.page ?? 1}`;
  return fetchListResilient(
    key,
    async (s) => (await jikanApi.byGenre(genreId, opts, s)).data,
    (s) => anilistFallback.byGenre(genreId, opts, s),
    signal,
  );
}

export function fetchSearch(
  query: string,
  type: 'tv' | 'movie' | null,
  signal?: AbortSignal,
): Promise<JikanAnime[]> {
  const key = `search:${type ?? 'all'}:${query.toLowerCase()}`;
  return fetchListResilient(
    key,
    async (s) => (await jikanApi.search(query, type, s)).data,
    (s) => anilistFallback.search(query, type, s),
    signal,
  );
}
