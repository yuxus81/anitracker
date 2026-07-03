import type {
  JikanListResponse,
  JikanSingleResponse,
  JikanRelationsResponse,
  JikanRecommendationsResponse,
} from '@/types/jikan';

const BASE = 'https://api.jikan.moe/v4';
const MIN_GAP_MS = 380; // Jikan allows ~3 req/s; stay comfortably under it.
const MAX_RETRIES = 3;

export class JikanError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'JikanError';
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Serial queue: every request is chained so we never burst the API.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

async function run<T>(path: string, signal?: AbortSignal): Promise<T> {
  const gap = MIN_GAP_MS - (Date.now() - lastRequestAt);
  if (gap > 0) await delay(gap);

  let attempt = 0;
  // Retry loop with exponential backoff on rate limiting.
  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, { signal });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      // Network error — one gentle retry, then surface it.
      if (attempt >= 1) throw new JikanError(0, 'Netzwerkfehler bei der Anime-API');
      attempt += 1;
      await delay(600);
      continue;
    } finally {
      lastRequestAt = Date.now();
    }

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) throw new JikanError(429, 'Anime-API ist überlastet (Rate Limit)');
      await delay(600 * 2 ** attempt + 400);
      attempt += 1;
      continue;
    }
    if (res.status === 404) throw new JikanError(404, 'Nicht gefunden');
    if (!res.ok) throw new JikanError(res.status, `Anime-API-Fehler (${res.status})`);

    return (await res.json()) as T;
  }
}

/** Enqueue a Jikan request. Rejections propagate to the caller; the queue survives. */
export function jikan<T>(path: string, signal?: AbortSignal): Promise<T> {
  const result = queue.then(() => run<T>(path, signal));
  queue = result.catch(() => undefined);
  return result;
}

const enc = encodeURIComponent;

export const jikanApi = {
  search(query: string, type: 'tv' | 'movie' | null, signal?: AbortSignal) {
    const t = type ? `&type=${type}` : '';
    return jikan<JikanListResponse>(`/anime?q=${enc(query)}&limit=12&sfw${t}`, signal);
  },

  getAnimeFull(malId: number, signal?: AbortSignal) {
    return jikan<JikanSingleResponse>(`/anime/${malId}/full`, signal);
  },

  getAnime(malId: number, signal?: AbortSignal) {
    return jikan<JikanSingleResponse>(`/anime/${malId}`, signal);
  },

  getRelations(malId: number, signal?: AbortSignal) {
    return jikan<JikanRelationsResponse>(`/anime/${malId}/relations`, signal);
  },

  getRecommendations(malId: number, signal?: AbortSignal) {
    return jikan<JikanRecommendationsResponse>(`/anime/${malId}/recommendations`, signal);
  },

  getSeasonNow(page = 1, signal?: AbortSignal) {
    return jikan<JikanListResponse>(`/seasons/now?limit=20&page=${page}`, signal);
  },

  getTop(
    opts: {
      type?: 'tv' | 'movie';
      filter?: 'bypopularity' | 'favorite' | 'airing';
      page?: number;
    },
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({ limit: '20', page: String(opts.page ?? 1) });
    if (opts.type) params.set('type', opts.type);
    if (opts.filter) params.set('filter', opts.filter);
    return jikan<JikanListResponse>(`/top/anime?${params.toString()}`, signal);
  },

  byGenre(
    genreId: number,
    opts: {
      page?: number;
      orderBy?: 'members' | 'score' | 'start_date';
      sort?: 'asc' | 'desc';
      status?: 'airing' | 'complete' | 'upcoming';
      type?: 'tv' | 'movie';
    } = {},
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({
      genres: String(genreId),
      order_by: opts.orderBy ?? 'members',
      sort: opts.sort ?? 'desc',
      limit: '20',
      page: String(opts.page ?? 1),
      sfw: 'true',
    });
    if (opts.status) params.set('status', opts.status);
    if (opts.type) params.set('type', opts.type);
    return jikan<JikanListResponse>(`/anime?${params.toString()}`, signal);
  },
};
