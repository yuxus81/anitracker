/**
 * Minimal but accurate typings for the Jikan v4 responses we consume.
 * (We only declare the fields the app actually reads.)
 */

export interface JikanImage {
  image_url?: string | null;
  small_image_url?: string | null;
  large_image_url?: string | null;
}

export interface JikanImages {
  jpg?: JikanImage;
  webp?: JikanImage;
}

export interface JikanTitle {
  type: string; // "Default" | "English" | "Japanese" | ...
  title: string;
}

export interface JikanAiredProp {
  from?: { day: number | null; month: number | null; year: number | null };
  to?: { day: number | null; month: number | null; year: number | null };
}

export interface JikanAired {
  from: string | null;
  to: string | null;
  prop?: JikanAiredProp;
  string?: string | null;
}

export interface JikanBroadcast {
  day?: string | null; // "Sundays"
  time?: string | null; // "23:00" (JST)
  timezone?: string | null; // "Asia/Tokyo"
  string?: string | null; // "Sundays at 23:00 (JST)"
}

export interface JikanEntity {
  mal_id: number;
  type: string;
  name: string;
  url?: string;
}

export interface JikanRelationEntry {
  mal_id: number;
  type: string; // "anime" | "manga"
  name: string;
  url?: string;
}

export interface JikanRelation {
  relation: string; // "Sequel" | "Prequel" | "Parent story" | ...
  entry: JikanRelationEntry[];
}

export interface JikanGenre {
  mal_id: number;
  type: string;
  name: string;
}

export interface JikanAnime {
  mal_id: number;
  url?: string;
  images?: JikanImages;
  titles?: JikanTitle[];
  title?: string;
  title_english?: string | null;
  type?: string | null; // "TV" | "Movie" | "OVA" | "ONA" | "Special" | ...
  source?: string | null;
  episodes?: number | null;
  status?: string | null; // "Finished Airing" | "Currently Airing" | "Not yet aired"
  airing?: boolean;
  aired?: JikanAired;
  broadcast?: JikanBroadcast | null;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  synopsis?: string | null;
  season?: string | null; // "winter" | "spring" | "summer" | "fall"
  year?: number | null;
  studios?: JikanEntity[];
  producers?: JikanEntity[];
  licensors?: JikanEntity[];
  genres?: JikanGenre[];
  relations?: JikanRelation[];
}

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page?: number;
}

export interface JikanListResponse {
  data: JikanAnime[];
  pagination?: JikanPagination;
}

export interface JikanSingleResponse {
  data: JikanAnime;
}

export interface JikanRelationsResponse {
  data: JikanRelation[];
}

export interface JikanRecommendationEntry {
  entry: JikanAnime;
  votes?: number;
}

export interface JikanRecommendationsResponse {
  data: JikanRecommendationEntry[];
}
