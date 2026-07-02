/** Typed representation of the `animes` table (new schema, post-migration). */

export type AnimeCategory = 'watched' | 'next_season' | 'watchlist' | 'current';
export type AnimeStatus = 'active' | 'dead' | 'limbo' | 'superseded';
export type AnimeFormat = 'season' | 'movie' | 'finished';

export interface FranchiseMeta {
  episodes?: number | null;
  seasons?: number | null;
  movies?: number | null;
  specials?: number | null;
  last_scan?: string | number | null;
}

export interface AnimeRow {
  id: string;
  user_id: string;
  title: string;
  mal_id: number | null;
  cover_url: string | null;
  category: AnimeCategory;
  status: AnimeStatus;
  format: AnimeFormat | null;
  release_label: string | null;
  is_released: boolean;
  is_placeholder: boolean;
  last_updated_at: string | null;
  sort_order: number | null;
  franchise_meta: FranchiseMeta | null;
  created_at: string;
}

/** Shape used when inserting. `user_id` is filled by the DB default `auth.uid()`. */
export interface NewAnime {
  title: string;
  category: AnimeCategory;
  status?: AnimeStatus;
  mal_id?: number | null;
  cover_url?: string | null;
  format?: AnimeFormat | null;
  release_label?: string | null;
  is_released?: boolean;
  is_placeholder?: boolean;
  last_updated_at?: string | null;
  sort_order?: number | null;
  franchise_meta?: FranchiseMeta | null;
}

export type AnimeUpdate = Partial<Omit<AnimeRow, 'id' | 'user_id' | 'created_at'>>;

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  subscription: PushSubscriptionJSON;
  created_at: string;
}
