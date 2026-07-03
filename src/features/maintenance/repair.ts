import type { AnimeRow } from '@/types/db';

export interface DuplicateGroup {
  /** Stable id for the group (React key). */
  key: string;
  keep: AnimeRow;
  remove: AnimeRow[];
}

export interface RepairReport {
  /** Rows without a cover (a poster can be fetched from Jikan by id or title). */
  missingCovers: AnimeRow[];
  /** Groups of duplicate rows, each with a chosen keeper. */
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

/** Normalized title for matching: strip accents/punctuation, lowercase, collapse spaces. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Choose which row to keep from a duplicate set. Preference order:
 * has a cover > has a mal_id > richer franchise_meta > older (earliest created_at).
 */
export function pickKeeper(rows: AnimeRow[]): AnimeRow {
  return [...rows].sort((a, b) => {
    const cover = Number(hasCover(b)) - Number(hasCover(a));
    if (cover !== 0) return cover;
    const mal = Number(b.mal_id != null) - Number(a.mal_id != null);
    if (mal !== 0) return mal;
    const meta = metaScore(b) - metaScore(a);
    if (meta !== 0) return meta;
    return a.created_at.localeCompare(b.created_at);
  })[0]!;
}

/**
 * Analyse the library for imageless rows and duplicates. Two rows count as
 * duplicates when they share a category AND either the same mal_id or the same
 * normalized title — so entries added by title only (mal_id = null) are caught
 * too, which the id-only check used to miss.
 */
export function scanLibrary(rows: AnimeRow[]): RepairReport {
  // Union-find over row indices; merge on shared (category+mal_id) or (category+title).
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const byMal = new Map<string, number>();
  const byTitle = new Map<string, number>();
  rows.forEach((r, i) => {
    if (r.mal_id != null) {
      const k = `${r.category}::m${r.mal_id}`;
      const seen = byMal.get(k);
      if (seen !== undefined) union(i, seen);
      else byMal.set(k, i);
    }
    const t = normalizeTitle(r.title);
    if (t) {
      const k = `${r.category}::t${t}`;
      const seen = byTitle.get(k);
      if (seen !== undefined) union(i, seen);
      else byTitle.set(k, i);
    }
  });

  const groups = new Map<number, AnimeRow[]>();
  rows.forEach((r, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(r);
    groups.set(root, list);
  });

  const duplicates: DuplicateGroup[] = [];
  const removeIds = new Set<string>();
  for (const [root, list] of groups) {
    if (list.length < 2) continue;
    const keep = pickKeeper(list);
    const remove = list.filter((r) => r.id !== keep.id);
    remove.forEach((r) => removeIds.add(r.id));
    duplicates.push({ key: String(root), keep, remove });
  }

  // Don't offer to backfill covers for rows we're about to delete as dupes.
  const missingCovers = rows.filter((r) => !hasCover(r) && !removeIds.has(r.id));

  return { missingCovers, duplicates };
}
