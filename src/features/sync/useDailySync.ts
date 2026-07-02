import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { fetchAnimes, insertAnime, updateAnime } from '@/api/animes';
import { jikanApi } from '@/api/jikan';
import { isAired, parseJikanDate } from '@/utils/dates';
import { getBestTitle, getCover } from '@/utils/titles';
import { toast } from '@/store/ui';

const THROTTLE_KEY = 'anitracker.lastSync';
const INTERVAL_MS = 12 * 60 * 60 * 1000; // at most twice a day

// Module-level guard: survives React StrictMode's double-mount so we sync once.
let syncStarted = false;

/**
 * Once-a-day background check: are any tracked continuations now released, and
 * did any "limbo" (uncertain) watched series get a sequel? All requests go
 * through the shared Jikan queue (serialized + backoff), failures are swallowed
 * per item so one bad lookup never aborts the run.
 */
async function runSync(qc: QueryClient): Promise<void> {
  const rows = await fetchAnimes();
  let updates = 0;

  // a) Unreleased continuations with a MAL id → did they air?
  const pending = rows.filter((r) => r.category === 'next_season' && !r.is_released && r.mal_id);
  for (const r of pending) {
    try {
      const a = (await jikanApi.getAnime(r.mal_id!)).data;
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
      const relations = (await jikanApi.getRelations(r.mal_id!)).data;
      const sequel = relations
        .find((x) => x.relation === 'Sequel')
        ?.entry.find((e) => e.type === 'anime');
      if (!sequel) continue;

      if (!rows.some((x) => x.mal_id === sequel.mal_id)) {
        const full = (await jikanApi.getAnime(sequel.mal_id)).data;
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

  if (updates > 0) {
    await qc.invalidateQueries({ queryKey: qk.animes });
    toast.success(`${updates} Update${updates > 1 ? 's' : ''} gefunden!`, '🔄');
  }
}

/** Kick off the daily sync while the user is logged in (throttled via localStorage). */
export function useDailySync(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || syncStarted) return;
    const last = Number(localStorage.getItem(THROTTLE_KEY) ?? 0);
    if (Date.now() - last < INTERVAL_MS) return;
    syncStarted = true;
    localStorage.setItem(THROTTLE_KEY, String(Date.now()));
    runSync(qc).catch(() => {
      /* never crash the app over a background sync */
    });
  }, [enabled, qc]);
}
