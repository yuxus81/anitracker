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
import { categoryKeyForRow, themeForRow } from '@/theme/categoryTheme';
import { useDetailStore } from './detailStore';
import { FranchiseExplorer } from './FranchiseExplorer';
import { AiringBanner, EntryStats, StatTile, TileSkeletons, formatLabel } from './detailParts';
import { useAddAnime, useAnimesQuery, useDeleteAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { toast } from '@/store/ui';
import type { AnimeRow } from '@/types/db';
import type { ReactNode } from 'react';

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

// Categories whose popup shows the whole-franchise rollup ("Version 1").
// Everything else shows the single clicked entry ("Version 2").
const FRANCHISE_VIEW_KEYS = new Set(['gesehen', 'suchtNeuigkeiten', 'watchlist']);

function LibraryDetail({ row, onClose }: { row: AnimeRow; onClose: () => void }) {
  const del = useDeleteAnime();
  const update = useUpdateAnime();
  const openFranchise = useFranchiseStore((s) => s.open);
  const theme = themeForRow(row);
  const franchiseView = FRANCHISE_VIEW_KEYS.has(categoryKeyForRow(row));

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
    actions.push({ label: 'Fortsetzung prüfen', variant: 'neon', onClick: checkFranchise });
  } else if (row.category === 'next_season' && !row.is_released) {
    actions.push({ label: 'Als erschienen', variant: 'purple', onClick: markReleased });
  } else if (row.category === 'next_season' && row.is_released) {
    actions.push({ label: 'Jetzt schauen', variant: 'neon', onClick: startWatching });
  } else if (row.category === 'watchlist') {
    actions.push({ label: 'Jetzt schauen', variant: 'neon', onClick: startWatching });
  } else if (row.category === 'current') {
    actions.push({ label: 'Abschließen', variant: 'neon', onClick: checkFranchise });
  }
  actions.push({ label: 'Entfernen', variant: 'danger', onClick: remove });

  const header: ReactNode = (
    <>
      {cover ? (
        <img src={cover} alt="" className="mx-auto max-h-80 rounded-2xl object-contain shadow-card" />
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

      <h3 className="mt-2 text-lg font-extrabold leading-tight">{row.title}</h3>

      {a?.airing && <AiringBanner broadcast={a.broadcast} />}
    </>
  );

  // Version 1 — whole-franchise explorer with drill-down.
  if (franchiseView && row.mal_id != null) {
    return (
      <FranchiseExplorer malId={row.mal_id} header={header} actions={<ActionGrid actions={actions} />} />
    );
  }

  // Version 2 — single tracked entry (or a minimal fallback without a mal_id).
  return (
    <div className="text-center">
      {header}

      {row.mal_id == null ? (
        <div className="my-4 grid grid-cols-2 gap-2.5">
          <StatTile label="Kategorie" valueClass="text-base leading-tight" value={theme.label} />
          {row.release_label && (
            <StatTile label="Release" valueClass="text-base leading-tight" value={row.release_label} />
          )}
          {row.format && (
            <StatTile label="Typ" valueClass="text-base leading-tight" value={formatLabel(row.format)} />
          )}
        </div>
      ) : detail.isLoading ? (
        <TileSkeletons count={3} />
      ) : detail.isError ? (
        <div className="my-4">
          <ErrorState onRetry={() => detail.refetch()} />
        </div>
      ) : a ? (
        <EntryStats
          score={a.score ?? null}
          episodes={a.episodes ?? null}
          duration={a.duration ?? null}
          type={a.type ?? null}
          format={row.format}
        />
      ) : null}

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

  const header: ReactNode = (
    <>
      <img
        src={getCover(a) ?? ''}
        alt=""
        className="mx-auto max-h-96 rounded-2xl object-contain shadow-glow-purple"
      />
      <h3 className="mt-4 text-lg font-extrabold leading-tight">{getBestTitle(a)}</h3>
      {a.airing && <AiringBanner broadcast={a.broadcast} />}
    </>
  );

  const actions: ReactNode = tracked ? (
    <div className={cn('mt-4 rounded-xl border py-3 text-sm font-semibold', themeForRow(tracked).chip)}>
      Bereits in deiner Sammlung ({themeForRow(tracked).label})
    </div>
  ) : (
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      <ActionButton variant="purple" loading={addAnime.isPending} onClick={addToWatchlist}>
        Watchlist
      </ActionButton>
      <ActionButton variant="neon" onClick={markWatched}>
        Schon gesehen
      </ActionButton>
    </div>
  );

  // Discovery always shows the whole-franchise explorer ("Version 1").
  return <FranchiseExplorer malId={malId} header={header} actions={actions} />;
}
