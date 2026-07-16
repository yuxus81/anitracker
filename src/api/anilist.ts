import type {
  JikanAnime,
  JikanGenre,
  JikanRelation,
  JikanTitle,
} from '@/types/jikan';

/**
 * AniList fallback adapter.
 *
 * Jikan (the free MyAnimeList scraper API) regularly suffers partial outages —
 * its aggregation endpoints (/top, /seasons, search, /relations) return 504s
 * while single-anime lookups still work, or everything 429s under load. Those
 * outages are upstream and can't be fixed client-side, so every list fetch and
 * detail fetch gets a SECOND, independent data source: AniList's GraphQL API
 * (generous rate limits, very reliable, CORS-enabled).
 *
 * Everything here returns data mapped into the exact `JikanAnime` shape the
 * rest of the app consumes — including MAL ids (`idMal`), so tracking rows,
 * the IndexedDB caches and the franchise walker keep working identically no
 * matter which API served the payload. Entries without a MAL id are dropped.
 */

const ENDPOINT = 'https://graphql.anilist.co';

export class AniListError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AniListError';
  }
}

// ---- Raw AniList shapes (only the fields we request) ------------------------

interface AlDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

interface AlMedia {
  idMal: number | null;
  title: { romaji: string | null; english: string | null };
  coverImage: { extraLarge: string | null; large: string | null };
  format: string | null; // TV | TV_SHORT | MOVIE | SPECIAL | OVA | ONA | MUSIC
  episodes: number | null;
  duration: number | null;
  averageScore: number | null; // 0..100
  status: string | null; // FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS
  season: string | null; // WINTER | SPRING | SUMMER | FALL
  seasonYear: number | null;
  genres: string[] | null;
  countryOfOrigin: string | null;
  startDate?: AlDate | null;
  endDate?: AlDate | null;
  studios?: { nodes: Array<{ name: string }> } | null;
  description?: string | null;
  relations?: {
    edges: Array<{
      relationType: string | null;
      node: { idMal: number | null; type: string | null; title?: { romaji: string | null } | null };
    }>;
  } | null;
}

// ---- GraphQL transport -------------------------------------------------------

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal,
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      if (attempt >= 1) throw new AniListError(0, 'AniList nicht erreichbar');
      attempt += 1;
      await new Promise((r) => setTimeout(r, 800));
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 1) throw new AniListError(res.status, 'AniList momentan überlastet');
      attempt += 1;
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }
    if (!res.ok) throw new AniListError(res.status, `AniList-Fehler (${res.status})`);

    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!json.data) {
      throw new AniListError(400, json.errors?.[0]?.message ?? 'AniList-Antwort ohne Daten');
    }
    return json.data;
  }
}

// ---- Mapping: AniList → Jikan shape -----------------------------------------

const FORMAT_MAP: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
};

const STATUS_MAP: Record<string, string> = {
  FINISHED: 'Finished Airing',
  RELEASING: 'Currently Airing',
  NOT_YET_RELEASED: 'Not yet aired',
  CANCELLED: 'Finished Airing',
  HIATUS: 'Currently Airing',
};

const RELATION_MAP: Record<string, string> = {
  SEQUEL: 'Sequel',
  PREQUEL: 'Prequel',
  PARENT: 'Parent story',
  SIDE_STORY: 'Side story',
  SPIN_OFF: 'Spin-off',
  ALTERNATIVE: 'Alternative version',
  SUMMARY: 'Summary',
  CHARACTER: 'Character',
  ADAPTATION: 'Adaptation',
  SOURCE: 'Adaptation',
  OTHER: 'Other',
};

function toIso(d: AlDate | null | undefined): string | null {
  if (!d?.year) return null;
  const m = String(d.month ?? 1).padStart(2, '0');
  const day = String(d.day ?? 1).padStart(2, '0');
  return `${d.year}-${m}-${day}T00:00:00+00:00`;
}

function stripHtml(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mapRelations(m: AlMedia): JikanRelation[] | undefined {
  const edges = m.relations?.edges;
  if (!edges?.length) return undefined;
  const byType = new Map<string, JikanRelation>();
  for (const e of edges) {
    const rel = RELATION_MAP[e.relationType ?? ''] ?? 'Other';
    const malId = e.node?.idMal;
    if (!malId) continue;
    const entry = {
      mal_id: malId,
      type: (e.node.type ?? 'ANIME').toLowerCase(),
      name: e.node.title?.romaji ?? '',
    };
    const existing = byType.get(rel);
    if (existing) existing.entry.push(entry);
    else byType.set(rel, { relation: rel, entry: [entry] });
  }
  return byType.size ? [...byType.values()] : undefined;
}

/** Convert one AniList media node into the JikanAnime shape the app consumes. */
export function mapAniListMedia(m: AlMedia): JikanAnime | null {
  if (!m.idMal) return null; // the app keys everything on MAL ids

  const titles: JikanTitle[] = [];
  if (m.title.romaji) titles.push({ type: 'Default', title: m.title.romaji });
  if (m.title.english) titles.push({ type: 'English', title: m.title.english });

  const cover = m.coverImage.extraLarge ?? m.coverImage.large ?? null;
  const genres: JikanGenre[] | undefined = m.genres?.length
    ? m.genres.map((name) => ({ mal_id: 0, type: 'anime', name }))
    : undefined;

  return {
    mal_id: m.idMal,
    titles,
    title: m.title.romaji ?? m.title.english ?? undefined,
    title_english: m.title.english,
    images: {
      jpg: { image_url: cover, large_image_url: cover },
      webp: { image_url: cover, large_image_url: cover },
    },
    type: m.format ? (FORMAT_MAP[m.format] ?? m.format) : null,
    episodes: m.episodes,
    duration: m.duration ? `${m.duration} min per ep` : null,
    score: m.averageScore != null ? Math.round(m.averageScore) / 10 : null,
    status: m.status ? (STATUS_MAP[m.status] ?? null) : null,
    airing: m.status === 'RELEASING',
    aired: {
      from: toIso(m.startDate),
      to: toIso(m.endDate),
      prop: m.startDate?.year
        ? {
            from: {
              year: m.startDate.year,
              month: m.startDate.month,
              day: m.startDate.day,
            },
          }
        : undefined,
    },
    season: m.season ? m.season.toLowerCase() : null,
    year: m.seasonYear,
    genres,
    studios: m.studios?.nodes?.map((s) => ({ mal_id: 0, type: 'anime', name: s.name })),
    synopsis: stripHtml(m.description),
    relations: mapRelations(m),
  };
}

// ---- List queries (Discover + search fallback) -------------------------------

const LIST_FIELDS = `
  idMal
  title { romaji english }
  coverImage { extraLarge large }
  format episodes duration averageScore status season seasonYear genres countryOfOrigin
  startDate { year month day }
  studios(isMain: true) { nodes { name } }
`;

const LIST_QUERY = `
query (
  $page: Int, $perPage: Int, $search: String, $season: MediaSeason,
  $seasonYear: Int, $formatIn: [MediaFormat], $genre: String,
  $sort: [MediaSort], $status: MediaStatus
) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME, isAdult: false, search: $search, season: $season,
      seasonYear: $seasonYear, format_in: $formatIn, genre: $genre,
      sort: $sort, status: $status
    ) { ${LIST_FIELDS} }
  }
}`;

interface ListVars {
  page?: number;
  perPage?: number;
  search?: string;
  season?: string;
  seasonYear?: number;
  formatIn?: string[];
  genre?: string;
  sort?: string[];
  status?: string;
}

async function listQuery(vars: ListVars, signal?: AbortSignal): Promise<JikanAnime[]> {
  const data = await gql<{ Page: { media: AlMedia[] } }>(
    LIST_QUERY,
    { perPage: 20, page: 1, ...vars },
    signal,
  );
  return data.Page.media
    .filter((m) => m.countryOfOrigin !== 'CN') // mirror the app's donghua filter
    .map(mapAniListMedia)
    .filter((a): a is JikanAnime => a !== null);
}

const TYPE_FORMATS: Record<'tv' | 'movie', string[]> = {
  tv: ['TV'],
  movie: ['MOVIE'],
};

function currentSeason(): { season: string; seasonYear: number } {
  const now = new Date();
  const m = now.getMonth(); // 0..11
  const season = m <= 2 ? 'WINTER' : m <= 5 ? 'SPRING' : m <= 8 ? 'SUMMER' : 'FALL';
  return { season, seasonYear: now.getFullYear() };
}

/** MAL genre id → AniList genre string (only the genres the Discover UI offers). */
const GENRE_NAME: Record<number, string> = {
  1: 'Action',
  2: 'Adventure',
  8: 'Drama',
  10: 'Fantasy',
  22: 'Romance',
  30: 'Sports',
};

export const anilistFallback = {
  search(query: string, type: 'tv' | 'movie' | null, signal?: AbortSignal) {
    return listQuery(
      {
        search: query,
        perPage: 12,
        sort: ['SEARCH_MATCH'],
        formatIn: type ? TYPE_FORMATS[type] : undefined,
      },
      signal,
    );
  },

  top(
    opts: { type?: 'tv' | 'movie'; filter?: 'bypopularity' | 'favorite' | 'airing'; page?: number },
    signal?: AbortSignal,
  ) {
    const sort =
      opts.filter === 'bypopularity'
        ? ['POPULARITY_DESC']
        : opts.filter === 'favorite'
          ? ['FAVOURITES_DESC']
          : ['SCORE_DESC'];
    return listQuery(
      {
        page: opts.page ?? 1,
        sort,
        status: opts.filter === 'airing' ? 'RELEASING' : undefined,
        formatIn: opts.type ? TYPE_FORMATS[opts.type] : undefined,
      },
      signal,
    );
  },

  seasonNow(page = 1, signal?: AbortSignal) {
    return listQuery({ page, ...currentSeason(), sort: ['POPULARITY_DESC'] }, signal);
  },

  byGenre(
    genreId: number,
    opts: {
      page?: number;
      orderBy?: 'members' | 'score' | 'start_date';
      type?: 'tv' | 'movie';
    } = {},
    signal?: AbortSignal,
  ) {
    const genre = GENRE_NAME[genreId];
    const sort =
      opts.orderBy === 'score'
        ? ['SCORE_DESC']
        : opts.orderBy === 'start_date'
          ? ['START_DATE_DESC']
          : ['POPULARITY_DESC'];
    return listQuery(
      {
        page: opts.page ?? 1,
        genre,
        sort,
        formatIn: opts.type ? TYPE_FORMATS[opts.type] : undefined,
      },
      signal,
    );
  },
};

// ---- Detail query (popup / franchise fallback) --------------------------------

const DETAIL_QUERY = `
query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    ${LIST_FIELDS}
    endDate { year month day }
    description(asHtml: false)
    relations {
      edges {
        relationType(version: 2)
        node { idMal type title { romaji } }
      }
    }
  }
}`;

/**
 * Fetch one anime by MAL id from AniList, mapped to the Jikan `/full` shape
 * (details + relations in one payload — exactly what the popup and the
 * franchise walker need).
 */
export async function anilistGetFullByMalId(
  malId: number,
  signal?: AbortSignal,
): Promise<JikanAnime> {
  const data = await gql<{ Media: AlMedia | null }>(DETAIL_QUERY, { idMal: malId }, signal);
  const mapped = data.Media ? mapAniListMedia(data.Media) : null;
  if (!mapped) throw new AniListError(404, 'Nicht gefunden');
  return mapped;
}
