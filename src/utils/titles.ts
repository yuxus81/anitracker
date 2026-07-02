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
  return t
    .split(':')[0]!
    .split(' Season')[0]!
    .split(' Part')[0]!
    .trim()
    .toLowerCase();
}
