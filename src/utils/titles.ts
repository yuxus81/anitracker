import type { JikanAnime } from '@/types/jikan';

/** Prefer the English title, fall back to default/romaji, then the plain title. */
export function getBestTitle(anime: JikanAnime): string {
  const byType = (type: string) =>
    anime.titles?.find((t) => t.type === type && t.title)?.title;

  return (
    byType('English') ||
    anime.title_english ||
    byType('Default') ||
    anime.title ||
    byType('Japanese') ||
    'Unbekannt'
  );
}

/** Best available poster URL, preferring webp for size. */
export function getCover(anime: JikanAnime): string | null {
  return (
    anime.images?.webp?.large_image_url ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.webp?.image_url ||
    anime.images?.jpg?.image_url ||
    null
  );
}

/** Normalized base title for de-duplication (strips season/part suffixes). */
export function baseTitle(anime: JikanAnime): string {
  const t = getBestTitle(anime);
  // Only treat a colon as a subtitle separator when a real name precedes it.
  // Short prefixes are part of the title itself ("Re:Zero", "Dr.:..."), and
  // cutting there collapsed unrelated shows ("Re:Zero" & "Re:Creators" → "re")
  // so one of them silently vanished from search results.
  const colon = t.indexOf(':');
  const base = colon > 3 ? t.slice(0, colon) : t;
  return base.split(' Season')[0]!.split(' Part')[0]!.trim().toLowerCase();
}
