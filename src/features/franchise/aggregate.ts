import { jikanApi } from '@/api/jikan';
import { getBestTitle, getCover } from '@/utils/titles';
import { parseJikanDate } from '@/utils/dates';
import type { JikanAnime, JikanBroadcast } from '@/types/jikan';

/** A single franchise member, carried through to the drill-down list + detail. */
export interface FranchiseEntry {
  malId: number;
  title: string;
  cover: string | null;
  type: string | null; // raw Jikan type: "TV" | "Movie" | "OVA" | …
  year: string | null; // display label, e.g. "Winter 2027"
  score: number | null;
  episodes: number | null;
  duration: string | null;
  airing: boolean;
  broadcast: JikanBroadcast | null;
}

/** Whole-franchise rollup shown in the "Version 1" detail popup. */
export interface FranchiseAggregate {
  seasons: FranchiseEntry[]; // released/airing TV entries (chronological)
  movies: FranchiseEntry[]; // released movie entries
  specials: FranchiseEntry[]; // released OVA / ONA / Special / Music entries
  announced: FranchiseEntry[]; // entries not yet aired (any type)
  episodes: number; // total episodes across seasons
  score: number | null; // episode-weighted average score
}

// Relations that keep us inside the same franchise. We deliberately skip
// "Character", "Other" and "Adaptation" (manga) so unrelated works don't leak in.
const FRANCHISE_RELATIONS = new Set([
  'Prequel',
  'Sequel',
  'Parent story',
  'Full story',
  'Side story',
  'Alternative version',
  'Spin-off',
  'Summary',
]);

// Safety cap on API calls for very large franchises (Jikan is rate-limited).
const MAX_NODES = 20;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sortable timestamp for chronological ordering; unknown dates sort last. */
function airedMs(a: JikanAnime): number {
  const from = a.aired?.from ? Date.parse(a.aired.from) : NaN;
  if (!Number.isNaN(from)) return from;
  const year = a.year ?? a.aired?.prop?.from?.year;
  if (year) return Date.UTC(year, 0, 1);
  return Number.POSITIVE_INFINITY;
}

function toEntry(a: JikanAnime): FranchiseEntry {
  return {
    malId: a.mal_id,
    title: getBestTitle(a),
    cover: getCover(a),
    type: a.type ?? null,
    year: parseJikanDate(a),
    score: a.score ?? null,
    episodes: a.episodes ?? null,
    duration: a.duration ?? null,
    airing: a.airing === true,
    broadcast: a.broadcast ?? null,
  };
}

/**
 * Walks the entire franchise graph from `startId` (breadth-first across every
 * franchise relation, deduplicated and capped) and groups the members by type,
 * chronologically, alongside a total episode count and episode-weighted score.
 * Each anime is fetched once via `/full`, which bundles details and relations.
 */
export async function aggregateFranchise(
  startId: number,
  signal?: AbortSignal,
): Promise<FranchiseAggregate> {
  const cache = new Map<number, JikanAnime>();
  const load = async (id: number): Promise<JikanAnime> => {
    const hit = cache.get(id);
    if (hit) return hit;
    const data = (await jikanApi.getAnimeFull(id, signal)).data;
    cache.set(id, data);
    return data;
  };

  // Walk the relation graph one "wave" (BFS depth) at a time. Everything in a
  // wave is dispatched together instead of awaited one-by-one: the shared
  // Jikan request queue still paces the actual network calls, but responses
  // for sibling entries now overlap instead of each waiting on the previous
  // one's full round trip — a few franchise-wide waves instead of N serial
  // round trips.
  const visited = new Set<number>([startId]);
  const members: JikanAnime[] = [];
  let frontier: number[] = [startId];

  while (frontier.length > 0 && members.length < MAX_NODES) {
    const batch = frontier.slice(0, MAX_NODES - members.length);
    const loaded = await Promise.all(batch.map(load));
    members.push(...loaded);

    const nextFrontier: number[] = [];
    for (const a of loaded) {
      for (const rel of a.relations ?? []) {
        if (!FRANCHISE_RELATIONS.has(rel.relation)) continue;
        for (const entry of rel.entry) {
          if (entry.type !== 'anime' || visited.has(entry.mal_id)) continue;
          visited.add(entry.mal_id);
          nextFrontier.push(entry.mal_id);
        }
      }
    }
    frontier = nextFrontier;
  }

  // Chronological order means each group array comes out sorted as we classify.
  members.sort((x, y) => airedMs(x) - airedMs(y));

  const seasons: FranchiseEntry[] = [];
  const movies: FranchiseEntry[] = [];
  const specials: FranchiseEntry[] = [];
  const announced: FranchiseEntry[] = [];
  let episodes = 0;
  let scoreWeight = 0;
  let weight = 0;

  for (const a of members) {
    if (a.status === 'Not yet aired') {
      announced.push(toEntry(a));
      continue;
    }
    const type = (a.type ?? '').toLowerCase();
    if (type === 'movie') {
      movies.push(toEntry(a));
    } else if (type === 'tv') {
      seasons.push(toEntry(a));
      episodes += a.episodes ?? 0;
    } else {
      specials.push(toEntry(a)); // OVA / ONA / Special / Music / TV Special / …
    }
    if (a.score != null) {
      const w = a.episodes ?? 1;
      scoreWeight += a.score * w;
      weight += w;
    }
  }

  return {
    seasons,
    movies,
    specials,
    announced,
    episodes,
    score: weight > 0 ? round1(scoreWeight / weight) : null,
  };
}
