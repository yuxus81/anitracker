import type { JikanAnime } from '@/types/jikan';
import { JikanError } from '@/api/jikan';

/**
 * Resilient fetch layer for LIST data (Discover rows, genre browse, search).
 *
 * Jikan's aggregation endpoints (/top, /seasons, search) are the flakiest part
 * of the API — under load they 429 or 504 for hours at a time, which used to
 * take the whole Entdecken page down on every device at once. This layer makes
 * a list fetch effectively unbreakable by trying, in order:
 *
 *   1. Fresh IndexedDB cache (< 30 min)  → instant, zero network, zero rate-limit cost
 *   2. Jikan (unless the circuit breaker says it's currently down)
 *   3. Recent stale cache (< 24 h)       → what the user last saw; better than a spinner
 *   4. AniList fallback                  → independent second API, fresh data
 *   5. Any stale cache (< 30 days)       → last resort before showing an error
 *
 * The circuit breaker remembers a transient Jikan failure for a short window so
 * that during an outage only the FIRST row pays the slow retry cost — every
 * subsequent fetch skips Jikan immediately and goes straight to the fallbacks.
 * Step 1 doubles as rate-limit protection: revisiting Entdecken within half an
 * hour no longer sends a single Jikan request.
 */

const DB_NAME = 'anitracker-list-cache';
const DB_VERSION = 1;
const STORE = 'lists';

const FRESH_TTL_MS = 30 * 60 * 1000; // serve without network
const RECENT_STALE_MS = 24 * 60 * 60 * 1000; // preferred over the fallback API
const MAX_STALE_MS = 30 * 24 * 60 * 60 * 1000; // absolute shelf life
const BREAKER_MS = 90 * 1000; // how long to consider Jikan "down"

interface CachedList {
  key: string;
  data: JikanAnime[];
  ts: number;
  source: 'jikan' | 'anilist';
}

// ---- IndexedDB plumbing (best-effort, mirrors jikanCache.ts) -----------------

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function readList(db: IDBDatabase, key: string): Promise<CachedList | undefined> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as CachedList | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function writeList(db: IDBDatabase, entry: CachedList): void {
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry);
  } catch {
    /* best-effort cache */
  }
}

let sweepDone = false;

function sweepExpired(db: IDBDatabase): void {
  if (sweepDone) return;
  sweepDone = true;
  try {
    const cursorReq = db.transaction(STORE, 'readwrite').objectStore(STORE).openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      const entry = cursor.value as CachedList;
      if (Date.now() - entry.ts > MAX_STALE_MS) cursor.delete();
      cursor.continue();
    };
  } catch {
    /* best-effort cleanup */
  }
}

// ---- Circuit breaker ----------------------------------------------------------

let jikanDownUntil = 0;

function isTransient(err: unknown): boolean {
  return err instanceof JikanError && (err.status === 429 || err.status === 0 || err.status >= 500);
}

/** Exposed for the detail cache: skip Jikan while a list fetch just saw it down. */
export function jikanLooksDown(): boolean {
  return Date.now() < jikanDownUntil;
}

export function reportJikanFailure(err: unknown): void {
  if (isTransient(err)) jikanDownUntil = Date.now() + BREAKER_MS;
}

export function reportJikanSuccess(): void {
  jikanDownUntil = 0;
}

// ---- The resilient list fetch ---------------------------------------------------

/**
 * Fetch a list of anime with full outage protection. `cacheKey` must uniquely
 * identify the query (endpoint + params). `fromJikan` runs the normal Jikan
 * call; `fromAniList` the equivalent AniList query (or null where none exists).
 */
export async function fetchListResilient(
  cacheKey: string,
  fromJikan: (signal?: AbortSignal) => Promise<JikanAnime[]>,
  fromAniList: ((signal?: AbortSignal) => Promise<JikanAnime[]>) | null,
  signal?: AbortSignal,
): Promise<JikanAnime[]> {
  const db = await openDb();
  let cached: CachedList | undefined;
  if (db) {
    sweepExpired(db);
    cached = await readList(db, cacheKey);
    if (cached && Date.now() - cached.ts > MAX_STALE_MS) cached = undefined;
  }

  // 1. Fresh cache → no network at all.
  if (cached && Date.now() - cached.ts < FRESH_TTL_MS) return cached.data;

  // 2. Jikan, unless the breaker is open.
  let jikanError: unknown = null;
  if (!jikanLooksDown()) {
    try {
      const data = await fromJikan(signal);
      reportJikanSuccess();
      if (db) writeList(db, { key: cacheKey, data, ts: Date.now(), source: 'jikan' });
      return data;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      reportJikanFailure(err);
      jikanError = err;
      // Non-transient errors (e.g. a real 404 or 400) shouldn't be masked by
      // fallbacks — they indicate a broken query, not a broken API.
      if (!isTransient(err)) throw err;
    }
  }

  // 3. Recent stale cache — what the user last saw beats a foreign refetch.
  if (cached && Date.now() - cached.ts < RECENT_STALE_MS) return cached.data;

  // 4. AniList fallback.
  if (fromAniList) {
    try {
      const data = await fromAniList(signal);
      if (data.length > 0) {
        if (db) writeList(db, { key: cacheKey, data, ts: Date.now(), source: 'anilist' });
        return data;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err;
      /* fall through to old stale */
    }
  }

  // 5. Anything cached at all.
  if (cached) return cached.data;

  throw jikanError ?? new JikanError(0, 'Anime-API momentan nicht erreichbar');
}
