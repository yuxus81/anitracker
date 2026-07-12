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

/**
 * Two-class serial queue. All requests still run strictly one at a time (never
 * bursting the API), but interactive work (search, popup detail, franchise
 * walk) always overtakes background work (the app-open sync). Without this,
 * opening the app queued the whole sync FIRST and every popup/search waited
 * seconds behind it.
 */
export type JikanPriority = 'interactive' | 'background';

interface QueueTask {
  exec: () => Promise<void>;
}

const queues: Record<JikanPriority, QueueTask[]> = { interactive: [], background: [] };
let pumping = false;
let lastRequestAt = 0;

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  for (;;) {
    const task = queues.interactive.shift() ?? queues.background.shift();
    if (!task) break;
    await task.exec();
  }
  pumping = false;
}

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

    // Retry transient failures: rate limiting (429) AND upstream gateway errors
    // (502/503/504 — Jikan's aggregation endpoints like /top and /seasons flake
    // under load). 404 is a real "not found" and must never be retried.
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= MAX_RETRIES) {
        throw new JikanError(
          res.status,
          res.status === 429
            ? 'Anime-API ist überlastet (Rate Limit)'
            : 'Anime-API momentan nicht erreichbar',
        );
      }
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
export function jikan<T>(
  path: string,
  signal?: AbortSignal,
  priority: JikanPriority = 'interactive',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queues[priority].push({ exec: () => run<T>(path, signal).then(resolve, reject) });
    void pump();
  });
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

  getAnime(malId: number, signal?: AbortSignal, priority: JikanPriority = 'interactive') {
    return jikan<JikanSingleResponse>(`/anime/${malId}`, signal, priority);
  },

  getRelations(malId: number, signal?: AbortSignal, priority: JikanPriority = 'interactive') {
    return jikan<JikanRelationsResponse>(`/anime/${malId}/relations`, signal, priority);
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
