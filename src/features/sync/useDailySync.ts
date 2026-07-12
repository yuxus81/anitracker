import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { fetchAnimes, insertAnime, updateAnime } from '@/api/animes';
import { jikanApi } from '@/api/jikan';
import { isAired, parseJikanDate } from '@/utils/dates';
import { getBestTitle, getCover } from '@/utils/titles';
import { toast } from '@/store/ui';
import type { AnimeRow } from '@/types/db';

/** Strip the German " – Fortsetzung" suffix we append to placeholder titles. */
function baseTitleOf(title: string): string {
  return title.replace(/\s*[–-]\s*Fortsetzung\s*$/i, '').trim();
}

/**
 * The season a placeholder is waiting on a sequel for. Prefers the stored
 * `source_mal_id`; for older placeholders (created before that column existed,
 * e.g. Solo Leveling) it falls back to matching the base title against a
 * tracked `watched` season that has a MAL id.
 */
function findSourceMalId(row: AnimeRow, rows: AnimeRow[]): number | null {
  if (row.source_mal_id) return row.source_mal_id;
  const base = baseTitleOf(row.title).toLowerCase();
  if (!base) return null;
  const match = rows.find(
    (x) =>
      x.mal_id != null &&
      x.category === 'watched' &&
      (x.title.toLowerCase() === base || x.title.toLowerCase().startsWith(base)),
  );
  return match?.mal_id ?? null;
}

// Module-level guard: survives React StrictMode's double-mount so we sync once
// per app session (i.e. once per open), not once per component mount.
let syncStarted = false;

/**
 * Runs once per app open: are any tracked continuations now released, and did
 * any "limbo" (uncertain) watched series or placeholder get a sequel? All
 * requests go through the shared Jikan queue (serialized + backoff), failures
 * are swallowed per item so one bad lookup never aborts the run.
 */
async function runSync(qc: QueryClient): Promise<void> {
  const rows = await fetchAnimes();
  let updates = 0;

  // a) Unreleased continuations with a MAL id → did they air?
  const pending = rows.filter(
    (r) => r.category === 'next_season' && !r.is_released && r.mal_id && !r.is_placeholder,
  );
  for (const r of pending) {
    try {
      const a = (await jikanApi.getAnime(r.mal_id!, undefined, 'background')).data;
      if (isAired(a.status)) {
        await updateAnime(r.id, {
          is_released: true,
          last_updated_at: new Date().toISOString(),
          release_label: 'Verfügbar',
        });
        updates += 1;
      }
    } catch {
      /* ignore this item, continue */
    }
  }

  // b) "Limbo" watched series → has a sequel appeared meanwhile?
  const limbos = rows.filter((r) => r.category === 'watched' && r.status === 'limbo' && r.mal_id);
  for (const r of limbos) {
    try {
      const relations = (await jikanApi.getRelations(r.mal_id!, undefined, 'background')).data;
      const sequel = relations
        .find((x) => x.relation === 'Sequel')
        ?.entry.find((e) => e.type === 'anime');
      if (!sequel) continue;

      if (!rows.some((x) => x.mal_id === sequel.mal_id)) {
        const full = (await jikanApi.getAnime(sequel.mal_id, undefined, 'background')).data;
        await insertAnime({
          title: getBestTitle(full),
          category: 'next_season',
          status: 'active',
          mal_id: sequel.mal_id,
          cover_url: getCover(full),
          format: full.type === 'Movie' ? 'movie' : 'season',
          release_label: parseJikanDate(full) ?? 'Datum unbekannt',
          is_released: isAired(full.status),
          is_placeholder: false,
          sort_order: Date.now(),
        });
      }
      await updateAnime(r.id, { status: 'active' }); // resolved
      updates += 1;
    } catch {
      /* ignore this item, continue */
    }
  }

  // c) Placeholder continuations (no MAL id yet) → has the season we're waiting
  // on finally got an officially listed sequel? If so, upgrade the placeholder
  // in place with the real id + metadata; from then on arm (a) tracks its
  // release like any other continuation.
  const placeholders = rows.filter(
    (r) => r.category === 'next_season' && r.is_placeholder && !r.is_released,
  );
  for (const r of placeholders) {
    try {
      const sourceMalId = findSourceMalId(r, rows);
      if (!sourceMalId) continue;
      // Persist a title-matched source so future runs resolve it directly.
      // Best-effort in its own try: if this write fails (e.g. schema drift),
      // it must NOT abort the actual sequel check below.
      if (!r.source_mal_id) {
        try {
          await updateAnime(r.id, { source_mal_id: sourceMalId });
        } catch {
          /* purely an optimization; resolution still works via title match */
        }
      }

      const relations = (await jikanApi.getRelations(sourceMalId, undefined, 'background')).data;
      const sequel = relations
        .find((x) => x.relation === 'Sequel')
        ?.entry.find((e) => e.type === 'anime');
      if (!sequel) continue;
      // Already tracked under its real id elsewhere → don't create a duplicate.
      if (rows.some((x) => x.id !== r.id && x.mal_id === sequel.mal_id)) continue;

      const full = (await jikanApi.getAnime(sequel.mal_id, undefined, 'background')).data;
      const released = isAired(full.status);
      await updateAnime(r.id, {
        title: getBestTitle(full),
        mal_id: sequel.mal_id,
        cover_url: getCover(full) ?? r.cover_url,
        format: full.type === 'Movie' ? 'movie' : 'season',
        release_label: released ? 'Verfügbar' : (parseJikanDate(full) ?? 'Datum unbekannt'),
        is_released: released,
        is_placeholder: false,
        source_mal_id: null,
        last_updated_at: new Date().toISOString(),
      });
      toast.success(`„${getBestTitle(full)}" ist jetzt offiziell angekündigt!`, '🔮');
      updates += 1;
    } catch {
      /* ignore this item, continue */
    }
  }

  if (updates > 0) {
    await qc.invalidateQueries({ queryKey: qk.animes });
    toast.success(`${updates} Update${updates > 1 ? 's' : ''} gefunden!`, '🔄');
  }
}

// Give interactive first-paint requests (Discover rows, a quickly opened popup)
// a head start before the background sync joins the request queue.
const SYNC_START_DELAY_MS = 5000;

/**
 * Run `fn` only if no other tab is currently syncing. The Web Locks API gives
 * us an atomic cross-tab mutex; `ifAvailable` means a second tab skips the run
 * instead of queueing a duplicate. Browsers without the API just run directly.
 */
function runExclusive(fn: () => Promise<void>): void {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    void navigator.locks.request('anitracker-sync', { ifAvailable: true }, async (lock) => {
      if (lock) await fn();
    });
  } else {
    void fn();
  }
}

/** Kick off the sync once per app session, shortly after the user is logged in. */
export function useDailySync(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || syncStarted) return;
    syncStarted = true;
    // Deliberately not cleared on unmount: the module-level guard already ran,
    // and clearing would let StrictMode's double-mount cancel the only run.
    window.setTimeout(() => {
      runExclusive(() =>
        runSync(qc).catch(() => {
          /* never crash the app over a background sync */
        }),
      );
    }, SYNC_START_DELAY_MS);
  }, [enabled, qc]);
}
