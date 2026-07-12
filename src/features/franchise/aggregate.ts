import { getAnimeFullCached } from '@/lib/jikanCache';
import { JikanError } from '@/api/jikan';
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
  seasons: FranchiseEntry[]; // released/airing TV (+ full-length ONA) entries
  movies: FranchiseEntry[]; // released movie entries
  specials: FranchiseEntry[]; // released OVA / short ONA / Special entries
  announced: FranchiseEntry[]; // entries not yet aired (any type)
  episodes: number; // total episodes across seasons
  score: number | null; // episode-weighted average score
  /** True when the walk hit MAX_NODES — the counts may undershoot reality. */
  truncated: boolean;
}

// Relations that keep us inside the same franchise. We deliberately skip
// "Character", "Other" and "Adaptation" (manga) so unrelated works don't leak
// in — and "Summary" (recap compilations), which inflated the movie count.
const FRANCHISE_RELATIONS = new Set([
  'Prequel',
  'Sequel',
  'Parent story',
  'Full story',
  'Side story',
  'Alternative version',
  'Spin-off',
]);

// Promo clutter (music videos, previews, commercials) reachable via relations.
// It isn't watchable franchise content and made the Specials count look wrong.
const NOISE_TYPES = new Set(['music', 'pv', 'cm']);

// Full seasons released straight to web (Netflix & co.) are typed "ONA" on MAL.
// Anything this long is a season for our purposes, not a special.
const ONA_SEASON_MIN_EPISODES = 5;

// Safety cap on API calls for very large franchises (Jikan is rate-limited).
// The persistent per-anime cache keeps even big walks cheap on repeat visits.
const MAX_NODES = 40;

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

/** Whether an entry counts as a full season: TV, or a full-length web release. */
function isSeason(type: string, episodes: number | null | undefined): boolean {
  return type === 'tv' || (type === 'ona' && (episodes ?? 0) >= ONA_SEASON_MIN_EPISODES);
}

/** Classify a set of franchise members into the grouped, chronological rollup. */
function groupMembers(members: JikanAnime[], truncated = false): FranchiseAggregate {
  // Chronological order means each group array comes out sorted as we classify.
  const sorted = [...members].sort((x, y) => airedMs(x) - airedMs(y));

  const seasons: FranchiseEntry[] = [];
  const movies: FranchiseEntry[] = [];
  const specials: FranchiseEntry[] = [];
  const announced: FranchiseEntry[] = [];
  let episodes = 0;
  let scoreWeight = 0;
  let weight = 0;

  for (const a of sorted) {
    const type = (a.type ?? '').toLowerCase();
    if (NOISE_TYPES.has(type)) continue;
    if (a.status === 'Not yet aired') {
      announced.push(toEntry(a));
      continue;
    }
    if (type === 'movie') {
      movies.push(toEntry(a));
    } else if (isSeason(type, a.episodes)) {
      seasons.push(toEntry(a));
      episodes += a.episodes ?? 0;
    } else {
      specials.push(toEntry(a)); // OVA / short ONA / Special / TV Special / …
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
    truncated,
  };
}

export interface AggregateOptions {
  signal?: AbortSignal;
  /**
   * Called after every BFS wave with the rollup computed so far. Lets the UI
   * paint partial tiles within ~1–2s and fill them in live, instead of blocking
   * on a blank skeleton until the whole franchise finished loading.
   */
  onWave?: (partial: FranchiseAggregate) => void;
}

/**
 * Walks the entire franchise graph from `startId` (breadth-first across every
 * franchise relation, deduplicated and capped) and groups the members by type,
 * chronologically, alongside a total episode count and episode-weighted score.
 * Each anime is fetched once via `/full` (persistently cached), so repeat and
 * cross-franchise visits skip the network entirely.
 */
export async function aggregateFranchise(
  startId: number,
  opts: AggregateOptions = {},
): Promise<FranchiseAggregate> {
  const { signal, onWave } = opts;

  // Walk the relation graph one "wave" (BFS depth) at a time. Everything in a
  // wave is dispatched together instead of awaited one-by-one: the shared
  // Jikan request queue still paces the actual network calls, but responses
  // for sibling entries now overlap instead of each waiting on the previous
  // one's full round trip — a few franchise-wide waves instead of N serial
  // round trips. Cache hits resolve without touching the queue at all.
  const visited = new Set<number>([startId]);
  const members: JikanAnime[] = [];
  let frontier: number[] = [startId];

  while (frontier.length > 0 && members.length < MAX_NODES) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const batch = frontier.slice(0, MAX_NODES - members.length);
    // allSettled, not all: a single flaky node (Jikan 5xx/timeout) must not sink
    // the whole franchise rollup. Skip the failures, keep what loaded.
    const settled = await Promise.allSettled(batch.map((id) => getAnimeFullCached(id, signal)));
    const loaded = settled
      .filter((r): r is PromiseFulfilledResult<JikanAnime> => r.status === 'fulfilled')
      .map((r) => r.value);
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

    // Emit progress after each wave (but not the final one — the caller gets
    // that as the resolved value, avoiding a redundant duplicate render).
    if (onWave && frontier.length > 0 && members.length < MAX_NODES) {
      onWave(groupMembers(members));
    }
  }

  // Only a total wipeout (e.g. the seed itself is unreachable) is a real error;
  // surface it so the popup shows a retry instead of an empty, misleading rollup.
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (members.length === 0) {
    throw new JikanError(0, 'Franchise konnte nicht geladen werden');
  }
  // A non-empty frontier after the loop means we stopped at the cap, not at the
  // graph's natural edge — flag it so the UI can say the counts are a floor.
  return groupMembers(members, frontier.length > 0);
}
