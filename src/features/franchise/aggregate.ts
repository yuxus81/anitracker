import { jikanApi } from '@/api/jikan';
import type { JikanAnime } from '@/types/jikan';

/** Whole-franchise rollup shown in the "Version 1" detail popup. */
export interface FranchiseAggregate {
  seasons: number; // released/airing TV entries
  episodes: number; // total episodes across those TV entries
  movies: number; // released movie entries
  specials: number; // released OVA / ONA / Special / Music entries
  announced: number; // entries not yet aired (any type)
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

/**
 * Walks the entire franchise graph from `startId` (breadth-first across every
 * franchise relation, deduplicated and capped) and rolls the members up into
 * per-type counts plus an episode-weighted average score. Each anime is fetched
 * once via the `/full` endpoint, which bundles details and relations together.
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

  const queue: number[] = [startId];
  const visited = new Set<number>([startId]);
  const members: JikanAnime[] = [];

  while (queue.length > 0 && members.length < MAX_NODES) {
    const id = queue.shift()!;
    const a = await load(id);
    members.push(a);
    for (const rel of a.relations ?? []) {
      if (!FRANCHISE_RELATIONS.has(rel.relation)) continue;
      for (const entry of rel.entry) {
        if (entry.type !== 'anime' || visited.has(entry.mal_id)) continue;
        visited.add(entry.mal_id);
        queue.push(entry.mal_id);
      }
    }
  }

  let seasons = 0;
  let episodes = 0;
  let movies = 0;
  let specials = 0;
  let announced = 0;
  let scoreWeight = 0;
  let weight = 0;

  for (const a of members) {
    if (a.status === 'Not yet aired') {
      announced += 1;
      continue;
    }
    const type = (a.type ?? '').toLowerCase();
    if (type === 'movie') {
      movies += 1;
    } else if (type === 'tv') {
      seasons += 1;
      episodes += a.episodes ?? 0;
    } else {
      specials += 1; // OVA / ONA / Special / Music / TV Special / …
    }
    if (a.score != null) {
      const w = a.episodes ?? 1;
      scoreWeight += a.score * w;
      weight += w;
    }
  }

  return {
    seasons,
    episodes,
    movies,
    specials,
    announced,
    score: weight > 0 ? round1(scoreWeight / weight) : null,
  };
}
