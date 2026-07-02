import type { JikanAnime } from '@/types/jikan';

const SEASON_DE: Record<string, string> = {
  winter: 'Winter',
  spring: 'Frühling',
  summer: 'Sommer',
  fall: 'Herbst',
};

/**
 * Human-readable German release hint from Jikan data:
 *   season + year  -> "Winter 2027"
 *   else aired.from -> "2027"
 *   else            -> null (caller decides on "Datum unbekannt")
 */
export function parseJikanDate(anime: JikanAnime): string | null {
  if (anime.season && anime.year) {
    const s = SEASON_DE[anime.season.toLowerCase()] ?? anime.season;
    return `${s} ${anime.year}`;
  }
  if (anime.year) return String(anime.year);
  const year = anime.aired?.prop?.from?.year;
  if (year) return String(year);
  return null;
}

/** Whether a Jikan status counts as "released / watchable". */
export function isAired(status: string | null | undefined): boolean {
  return status === 'Currently Airing' || status === 'Finished Airing';
}
