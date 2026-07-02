import { jikanApi } from '@/api/jikan';
import { getBestTitle, getCover } from '@/utils/titles';
import { parseJikanDate, isAired } from '@/utils/dates';
import type { JikanAnime, JikanRelation } from '@/types/jikan';

/** One entry on a franchise's chronological timeline. */
export interface TimelineNode {
  malId: number;
  title: string;
  cover: string | null;
  type: string | null;
  label: string | null; // "Winter 2027" | "2025" | null
  status: string | null; // raw Jikan status
  airing: boolean; // currently airing
  released: boolean; // isAired(status) → already watchable
}

const MAX_CHAIN = 15;

function pickRelation(relations: JikanRelation[] | undefined, names: string[]): number | null {
  if (!relations) return null;
  for (const rel of relations) {
    if (names.includes(rel.relation)) {
      const entry = rel.entry.find((e) => e.type === 'anime');
      if (entry) return entry.mal_id;
    }
  }
  return null;
}

function toNode(a: JikanAnime): TimelineNode {
  return {
    malId: a.mal_id,
    title: getBestTitle(a),
    cover: getCover(a),
    type: a.type ?? null,
    label: parseJikanDate(a),
    status: a.status ?? null,
    airing: a.airing === true,
    released: isAired(a.status),
  };
}

/**
 * Build a chronological franchise timeline around `startId`.
 * Walks backwards via Prequel/Parent to the root, then forwards via Sequel.
 * The `/full` endpoint returns details AND relations in one call, so each anime
 * is fetched at most once (cached), keeping us well under the Jikan rate limit.
 */
export async function scanFranchise(startId: number, signal?: AbortSignal): Promise<TimelineNode[]> {
  const cache = new Map<number, JikanAnime>();

  async function load(id: number): Promise<JikanAnime> {
    const cached = cache.get(id);
    if (cached) return cached;
    const data = (await jikanApi.getAnimeFull(id, signal)).data;
    cache.set(id, data);
    return data;
  }

  // 1. Walk back to the root (earliest entry in the chain).
  let rootId = startId;
  const visitedBack = new Set<number>([startId]);
  for (let i = 0; i < MAX_CHAIN; i++) {
    const a = await load(rootId);
    const prev = pickRelation(a.relations, ['Prequel', 'Parent story']);
    if (!prev || visitedBack.has(prev)) break;
    visitedBack.add(prev);
    rootId = prev;
  }

  // 2. Walk forward, collecting the sequel chain.
  const nodes: TimelineNode[] = [];
  const seen = new Set<number>();
  let currentId: number | null = rootId;
  for (let i = 0; i < MAX_CHAIN && currentId !== null; i++) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const a = await load(currentId);
    nodes.push(toNode(a));
    currentId = pickRelation(a.relations, ['Sequel']);
  }

  return nodes;
}
