import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { ActionButton, type ActionVariant } from '@/components/ui/ActionButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilmIcon } from '@/components/icons/CategoryIcons';
import { qk } from '@/lib/queryClient';
import { jikanApi } from '@/api/jikan';
import { getBestTitle, getCover } from '@/utils/titles';
import { cn } from '@/utils/cn';
import { themeForRow } from '@/theme/categoryTheme';
import { useDetailStore } from './detailStore';
import { useAddAnime, useAnimesQuery, useDeleteAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { toast } from '@/store/ui';
import type { AnimeFormat, AnimeRow } from '@/types/db';

export function DetailModal() {
  const malId = useDetailStore((s) => s.malId);
  const row = useDetailStore((s) => s.row);
  const close = useDetailStore((s) => s.close);
  const open = malId !== null || row !== null;

  return (
    <Modal open={open} onClose={close} size="md">
      {row ? (
        <LibraryDetail row={row} onClose={close} />
      ) : malId !== null ? (
        <DiscoverDetail malId={malId} onClose={close} />
      ) : null}
    </Modal>
  );
}

// ---- Library entry (a tracked row) -----------------------------------------

interface Action {
  label: string;
  variant: ActionVariant;
  onClick: () => void;
}

/**
 * Lays actions out two-up. An odd final action stretches full width so the row
 * never leaves a lonely half-width button (e.g. context action + delete = two
 * side-by-side; a third would sit full width beneath them).
 */
function ActionGrid({ actions }: { actions: Action[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      {actions.map((ac, i) => {
        const lastOdd = i === actions.length - 1 && actions.length % 2 === 1;
        return (
          <ActionButton
            key={ac.label}
            variant={ac.variant}
            onClick={ac.onClick}
            className={cn(lastOdd && 'col-span-2')}
          >
            {ac.label}
          </ActionButton>
        );
      })}
    </div>
  );
}

function LibraryDetail({ row, onClose }: { row: AnimeRow; onClose: () => void }) {
  const del = useDeleteAnime();
  const update = useUpdateAnime();
  const openFranchise = useFranchiseStore((s) => s.open);
  const theme = themeForRow(row);

  const detail = useQuery({
    queryKey: row.mal_id != null ? qk.animeDetail(row.mal_id) : ['anime-detail', 'none'],
    enabled: row.mal_id != null,
    queryFn: async ({ signal }) => (await jikanApi.getAnimeFull(row.mal_id!, signal)).data,
  });
  const a = detail.data;
  const cover = (a && getCover(a)) || row.cover_url;

  function remove() {
    del.mutate(row.id);
    onClose();
  }
  function startWatching() {
    update.mutate({
      id: row.id,
      patch: {
        category: 'current',
        status: 'active',
        is_released: false,
        is_placeholder: false,
        sort_order: Date.now(),
      },
    });
    toast.success(`„${row.title}" ist jetzt in „Am Schauen"`, '▶️');
    onClose();
  }
  function markReleased() {
    update.mutate({
      id: row.id,
      patch: {
        is_released: true,
        last_updated_at: new Date().toISOString(),
        release_label: 'Verfügbar',
      },
    });
    toast.success(`„${row.title}" als erschienen markiert`, '🔥');
    onClose();
  }
  function checkFranchise() {
    onClose();
    openFranchise({
      malId: row.mal_id,
      title: row.title,
      coverUrl: row.cover_url,
      existingId: row.id,
    });
  }

  const actions: Action[] = [];
  if (row.category === 'watched') {
    actions.push({ label: '🔮 Fortsetzung prüfen', variant: 'neon', onClick: checkFranchise });
  } else if (row.category === 'next_season' && !row.is_released) {
    actions.push({ label: '✅ Als erschienen', variant: 'purple', onClick: markReleased });
  } else if (row.category === 'next_season' && row.is_released) {
    actions.push({ label: '▶️ Jetzt schauen', variant: 'neon', onClick: startWatching });
  } else if (row.category === 'watchlist') {
    actions.push({ label: '▶️ Jetzt schauen', variant: 'neon', onClick: startWatching });
  } else if (row.category === 'current') {
    actions.push({ label: '🏁 Abschließen', variant: 'neon', onClick: checkFranchise });
  }
  actions.push({ label: '🗑️ Entfernen', variant: 'danger', onClick: remove });

  return (
    <div className="text-center">
      {cover ? (
        <img src={cover} alt="" className="mx-auto max-h-64 rounded-2xl object-contain shadow-card" />
      ) : (
        <div
          className={cn(
            'mx-auto grid h-48 w-32 place-items-center rounded-2xl border',
            theme.tint,
            theme.text,
          )}
        >
          <FilmIcon className="h-10 w-10" />
        </div>
      )}

      <div className="mt-3 flex justify-center">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold',
            theme.chip,
          )}
        >
          {theme.label}
        </span>
      </div>

      <h3 className="mt-2 text-xl font-extrabold leading-tight">{row.title}</h3>

      {a?.airing && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-accent-neon/40 bg-accent-neon/10 py-2 text-sm font-bold text-accent-neon">
          🔴 Läuft aktuell
        </div>
      )}

      {row.mal_id != null ? (
        detail.isLoading ? (
          <div className="my-4 grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : detail.isError ? (
          <div className="my-4">
            <ErrorState onRetry={() => detail.refetch()} />
          </div>
        ) : a ? (
          <div className="my-4 grid grid-cols-2 gap-2 text-left">
            <Meta label="Score" value={a.score ? `★ ${a.score}` : '—'} />
            <Meta label="Folgen" value={a.episodes ? String(a.episodes) : '—'} />
            <Meta label="Typ" value={a.type ?? '—'} />
            <Meta label="Status" value={a.status ?? '—'} />
          </div>
        ) : null
      ) : (
        <div className="my-4 grid grid-cols-2 gap-2 text-left">
          <Meta label="Kategorie" value={theme.label} />
          {row.release_label && <Meta label="Release" value={row.release_label} />}
          {row.format && <Meta label="Typ" value={formatLabel(row.format)} />}
        </div>
      )}

      <ActionGrid actions={actions} />
    </div>
  );
}

// ---- Discovery result (a Jikan id, not necessarily tracked) ----------------

function DiscoverDetail({ malId, onClose }: { malId: number; onClose: () => void }) {
  const openFranchise = useFranchiseStore((s) => s.open);
  const addAnime = useAddAnime();
  const { data: animes } = useAnimesQuery();

  const detail = useQuery({
    queryKey: qk.animeDetail(malId),
    queryFn: async ({ signal }) => (await jikanApi.getAnimeFull(malId, signal)).data,
  });

  const tracked = animes?.find((x) => x.mal_id === malId);
  const a = detail.data;

  async function addToWatchlist() {
    if (!a) return;
    await addAnime.mutateAsync({
      title: getBestTitle(a),
      category: 'watchlist',
      status: 'active',
      mal_id: a.mal_id,
      cover_url: getCover(a),
      sort_order: Date.now(),
    });
    toast.success('Zur Watchlist hinzugefügt');
    onClose();
  }

  function markWatched() {
    if (!a) return;
    onClose();
    openFranchise({ malId: a.mal_id, title: getBestTitle(a), coverUrl: getCover(a) });
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-64 w-44 rounded-2xl" />
        <Skeleton className="mx-auto h-6 w-2/3 rounded" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }
  if (detail.isError || !a) {
    return <ErrorState onRetry={() => detail.refetch()} />;
  }

  return (
    <div className="text-center">
      <img
        src={getCover(a) ?? ''}
        alt=""
        className="mx-auto max-h-72 rounded-2xl object-contain shadow-glow-purple"
      />
      <h3 className="mt-4 text-xl font-extrabold leading-tight">{getBestTitle(a)}</h3>

      {a.airing && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-accent-neon/40 bg-accent-neon/10 py-2 text-sm font-bold text-accent-neon">
          🔴 Läuft aktuell
        </div>
      )}

      <div className="my-4 grid grid-cols-2 gap-2 text-left">
        <Meta label="Score" value={a.score ? `★ ${a.score}` : '—'} />
        <Meta label="Folgen" value={a.episodes ? String(a.episodes) : '—'} />
        <Meta label="Typ" value={a.type ?? '—'} />
        <Meta label="Status" value={a.status ?? '—'} />
      </div>

      {tracked ? (
        <div
          className={cn(
            'rounded-xl border py-3 text-sm font-semibold',
            themeForRow(tracked).chip,
          )}
        >
          Bereits in deiner Sammlung ({themeForRow(tracked).label})
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <ActionButton variant="purple" loading={addAnime.isPending} onClick={addToWatchlist}>
            🔖 Watchlist
          </ActionButton>
          <ActionButton variant="neon" onClick={markWatched}>
            ✅ Schon gesehen
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="mt-0.5 block font-extrabold">{value}</span>
    </div>
  );
}

function formatLabel(format: AnimeFormat): string {
  return format === 'movie' ? '🎬 Film' : format === 'season' ? '📺 Staffel' : 'Abgeschlossen';
}
