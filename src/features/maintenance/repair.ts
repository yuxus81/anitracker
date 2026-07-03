import type { AnimeRow } from '@/types/db';

export interface DuplicateGroup {
  malId: number;
  keep: AnimeRow;
  remove: AnimeRow[];
}

export interface RepairReport {
  /** Rows with a mal_id but no cover — a poster can be fetched from Jikan. */
  missingCovers: AnimeRow[];
  /** Groups sharing the same non-null mal_id, with a chosen keeper. */
  duplicates: DuplicateGroup[];
}

function hasCover(r: AnimeRow): boolean {
  return typeof r.cover_url === 'string' && r.cover_url.trim().length > 0;
}

function metaScore(r: AnimeRow): number {
  const m = r.franchise_meta;
  if (!m) return 0;
  return Object.values(m).filter((v) => v != null).length;
}

/**
 * Choose which row to keep from a duplicate set. Preference order:
 * has a cover > richer franchise_meta > older (earliest created_at).
 */
export function pickKeeper(rows: AnimeRow[]): AnimeRow {
  return [...rows].sort((a, b) => {
    const cover = Number(hasCover(b)) - Number(hasCover(a));
    if (cover !== 0) return cover;
    const meta = metaScore(b) - metaScore(a);
    if (meta !== 0) return meta;
    return a.created_at.localeCompare(b.created_at);
  })[0]!;
}

/** Analyse the library for imageless rows and true duplicates (same mal_id). */
export function scanLibrary(rows: AnimeRow[]): RepairReport {
  const missingCovers = rows.filter((r) => r.mal_id != null && !hasCover(r));

  const byMal = new Map<number, AnimeRow[]>();
  for (const r of rows) {
    if (r.mal_id == null) continue;
    const list = byMal.get(r.mal_id) ?? [];
    list.push(r);
    byMal.set(r.mal_id, list);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [malId, list] of byMal) {
    if (list.length < 2) continue;
    const keep = pickKeeper(list);
    duplicates.push({ malId, keep, remove: list.filter((r) => r.id !== keep.id) });
  }

  return { missingCovers, duplicates };
}
