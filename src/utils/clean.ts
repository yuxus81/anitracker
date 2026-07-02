import type { JikanAnime } from '@/types/jikan';
import { getBestTitle, getCover, baseTitle } from './titles';

/** Drop entries that would render as broken cards (no title / no image). */
export function cleanItems(items: JikanAnime[] | undefined | null): JikanAnime[] {
  if (!Array.isArray(items)) return [];
  return items.filter((a) => {
    const title = getBestTitle(a);
    if (!title || title === 'N/A' || title === 'Unbekannt') return false;
    if (!getCover(a)) return false;
    return true;
  });
}

const CN_KEYWORDS = [
  'bilibili', 'tencent', 'iqiyi', 'youku', 'mgtv', 'letv', 'migu', 'sohu',
  'china', 'chinese', 'donghua', 'manhua', 'cnmanga', 'haoliners',
  'beijing', 'shanghai', 'shenzen', 'shenzhen',
];

/** Optional origin filter: hide Chinese donghua productions (kept from old app). */
export function filterByOrigin(items: JikanAnime[]): JikanAnime[] {
  if (!Array.isArray(items)) return [];
  return items.filter((a) => {
    const entities = [
      ...(a.producers ?? []),
      ...(a.studios ?? []),
      ...(a.licensors ?? []),
    ].map((e) => (e.name ?? '').toLowerCase());
    return !entities.some((n) => CN_KEYWORDS.some((kw) => n.includes(kw)));
  });
}

/** De-duplicate by mal_id and normalized base title. */
export function dedupe(items: JikanAnime[]): JikanAnime[] {
  const seenId = new Set<number>();
  const seenTitle = new Set<string>();
  const out: JikanAnime[] = [];
  for (const a of items) {
    const bt = baseTitle(a);
    if (seenId.has(a.mal_id) || seenTitle.has(bt)) continue;
    seenId.add(a.mal_id);
    seenTitle.add(bt);
    out.push(a);
  }
  return out;
}

/** Full discovery cleanup pipeline. */
export function cleanDiscovery(items: JikanAnime[] | undefined | null): JikanAnime[] {
  return dedupe(filterByOrigin(cleanItems(items)));
}
