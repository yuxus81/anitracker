import type { JikanAnime } from '@/types/jikan';
import { jikanApi } from '@/api/jikan';
import { anilistGetFullByMalId } from '@/api/anilist';
import { jikanLooksDown, reportJikanFailure, reportJikanSuccess } from '@/lib/listCache';

/**
 * Persistent (IndexedDB) cache for Jikan `/full` payloads, keyed by MAL id.
 *
 * The `/full` endpoint bundles an anime's details AND its relations, and members
 * of one franchise overlap heavily. Caching each anime once — across app
 * restarts — means the franchise popup only pays the serial rate-limited fetch
 * cost on the very first cold visit; every later open is served from disk and
 * skips the network queue entirely, so it renders near-instantly.
 *
 * The whole layer is best-effort: if IndexedDB is unavailable or a transaction
 * fails, we silently fall through to the network so nothing ever breaks.
 */

const DB_NAME = 'anitracker-cache';
const DB_VERSION = 1;
const STORE = 'anime-full';
// Serve from cache for up to a week; relations/metadata barely move day to day.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Currently-airing entries change weekly (episode count, next broadcast slot),
// so they get a much shorter shelf life than finished shows.
const AIRING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CachedEntry {
  malId: number;
  data: JikanAnime;
  ts: number;
}

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
        db.createObjectStore(STORE, { keyPath: 'malId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function readEntry(db: IDBDatabase, malId: number): Promise<CachedEntry | undefined> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(malId);
      req.onsuccess = () => resolve(req.result as CachedEntry | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function writeEntry(db: IDBDatabase, entry: CachedEntry): void {
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry);
  } catch {
    /* best-effort cache; ignore write failures */
  }
}

// Once per session, sweep out entries past the hard TTL so the store doesn't
// grow forever (stale rows were previously only replaced, never removed).
let sweepDone = false;

function sweepExpired(db: IDBDatabase): void {
  if (sweepDone) return;
  sweepDone = true;
  try {
    const cursorReq = db.transaction(STORE, 'readwrite').objectStore(STORE).openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      const entry = cursor.value as CachedEntry;
      if (Date.now() - entry.ts > MAX_AGE_MS) cursor.delete();
      cursor.continue();
    };
  } catch {
    /* best-effort cleanup */
  }
}

// Coalesces concurrent misses for the same id into ONE network request. Without
// this, a single popup fires the seed anime twice (its detail query AND the
// franchise aggregate's first node), and React StrictMode's double-mount doubles
// every franchise fetch — together enough to blow Jikan's 60-req/min budget and
// trigger 429s. The shared fetch runs to completion and caches even if the
// caller that started it aborts, so a re-open is served straight from cache.
const pending = new Map<number, Promise<JikanAnime>>();

function abortRejection(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const fail = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
}

async function fetchAndCache(
  malId: number,
  db: IDBDatabase | null,
  stale: CachedEntry | undefined,
): Promise<JikanAnime> {
  try {
    // Deliberately unsignaled: the shared fetch should finish + cache regardless
    // of which caller aborts, so siblings and re-opens reuse it cleanly.
    // Outage ladder: Jikan → expired cache entry (full MAL fidelity, just old)
    // → AniList (independent API, mapped to the same shape). Only when all
    // three fail does the popup ever see an error again.
    if (!jikanLooksDown()) {
      try {
        const data = (await jikanApi.getAnimeFull(malId)).data;
        reportJikanSuccess();
        if (db) writeEntry(db, { malId, data, ts: Date.now() });
        return data;
      } catch (err) {
        reportJikanFailure(err);
        // A real 404 must surface as such, not get papered over by fallbacks.
        if ((err as { status?: number })?.status === 404) throw err;
      }
    }

    if (stale) return stale.data;

    const data = await anilistGetFullByMalId(malId);
    // Cache with an aged timestamp: good enough to serve during the outage,
    // but refreshed from Jikan (richer payload) once it recovers.
    if (db) writeEntry(db, { malId, data, ts: Date.now() - AIRING_MAX_AGE_MS });
    return data;
  } finally {
    pending.delete(malId);
  }
}

/**
 * Get an anime's `/full` payload, served from IndexedDB when a fresh copy
 * exists. On a miss it shares one in-flight fetch per id (see `pending`) and
 * stores the result. If the caller's `signal` aborts first, its await rejects
 * (so an aggregate walk stops early) while the shared fetch still completes and
 * caches — no wasted, no duplicated requests.
 */
export async function getAnimeFullCached(malId: number, signal?: AbortSignal): Promise<JikanAnime> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const db = await openDb();
  let stale: CachedEntry | undefined;
  if (db) {
    sweepExpired(db);
    const hit = await readEntry(db, malId);
    if (hit) {
      const maxAge = hit.data.airing ? AIRING_MAX_AGE_MS : MAX_AGE_MS;
      if (Date.now() - hit.ts < maxAge) return hit.data;
      // Expired, but kept as an outage fallback: old data beats an error popup.
      stale = hit;
    }
  }

  let shared = pending.get(malId);
  if (!shared) {
    shared = fetchAndCache(malId, db, stale);
    pending.set(malId, shared);
  }

  return signal ? Promise.race([shared, abortRejection(signal)]) : shared;
}
