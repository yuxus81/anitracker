import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { ActionButton, type ActionVariant } from '@/components/ui/ActionButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilmIcon } from '@/components/icons/CategoryIcons';
import { qk } from '@/lib/queryClient';
import { jikanApi } from '@/api/jikan';
import { getBestTitle, getCover } from '@/utils/titles';
import { formatBroadcastLocal } from '@/utils/broadcast';
import { cn } from '@/utils/cn';
import { categoryKeyForRow, themeForRow } from '@/theme/categoryTheme';
import { useDetailStore } from './detailStore';
import { useAddAnime, useAnimesQuery, useDeleteAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { useFranchiseAggregate } from '@/features/franchise/useFranchiseAggregate';
import { toast } from '@/store/ui';
import type { AnimeFormat, AnimeRow } from '@/types/db';
import type { JikanAnime, JikanBroadcast } from '@/types/jikan';

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

      {a?.airing && <AiringBanner broadcast={a.broadcast} />}

      {row.mal_id == null ? (
        <div className="my-4 grid grid-cols-2 gap-2 text-left">
          <Meta label="Kategorie" value={theme.label} />
          {row.release_label && <Meta label="Release" value={row.release_label} />}
          {row.format && <Meta label="Typ" value={formatLabel(row.format)} />}
        </div>
      ) : franchiseView ? (
        <FranchiseOverview malId={row.mal_id} />
      ) : detail.isLoading ? (
        <TileSkeletons count={3} />
      ) : detail.isError ? (
        <div className="my-4">
          <ErrorState onRetry={() => detail.refetch()} />
        </div>
      ) : a ? (
        <EntryStats a={a} row={row} />
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

  return (
    <div className="text-center">
      <img
        src={getCover(a) ?? ''}
        alt=""
        className="mx-auto max-h-72 rounded-2xl object-contain shadow-glow-purple"
      />
      <h3 className="mt-4 text-xl font-extrabold leading-tight">{getBestTitle(a)}</h3>

      {a.airing && <AiringBanner broadcast={a.broadcast} />}

      <FranchiseOverview malId={malId} />

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
            Watchlist
          </ActionButton>
          <ActionButton variant="neon" onClick={markWatched}>
            Schon gesehen
          </ActionButton>
        </div>
      )}
    </div>
  );
}

// ---- Shared popup pieces ----------------------------------------------------

/**
 * Cyan "now airing" banner. Only rendered when the entry is currently airing;
 * shows the next episode's slot converted to the viewer's local time.
 */
function AiringBanner({ broadcast }: { broadcast?: JikanBroadcast | null }) {
  const when = formatBroadcastLocal(broadcast);
  return (
    <div className="mt-3 rounded-xl border border-accent-neon/40 bg-accent-neon/10 px-4 py-2.5 text-accent-neon">
      <div className="flex items-center justify-center gap-2 text-sm font-bold">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-neon opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-neon" />
        </span>
        Läuft aktuell
      </div>
      {when && (
        <div className="mt-1 text-center text-xs font-semibold text-accent-neon/80">
          Neue Folge · {when}
        </div>
      )}
    </div>
  );
}

/** Version 1 — whole-franchise rollup (Geschaut, Watchlist, Entdecken). */
function FranchiseOverview({ malId }: { malId: number }) {
  const { data, isLoading, isError, refetch } = useFranchiseAggregate(malId, true);

  if (isLoading) return <TileSkeletons count={4} />;
  if (isError || !data) {
    return (
      <div className="my-4">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const tiles: { label: string; value: string }[] = [
    { label: 'Staffeln', value: data.seasons > 0 ? String(data.seasons) : '—' },
    { label: 'Folgen', value: data.episodes > 0 ? String(data.episodes) : '—' },
  ];
  if (data.movies > 0) tiles.push({ label: 'Filme', value: String(data.movies) });
  if (data.specials > 0) tiles.push({ label: 'Specials', value: String(data.specials) });
  if (data.announced > 0) tiles.push({ label: 'Angekündigt', value: String(data.announced) });
  tiles.push({ label: 'Ø Bewertung', value: data.score != null ? `★ ${data.score}` : '—' });

  return (
    <div className="my-4 grid grid-cols-2 gap-2 text-left">
      {tiles.map((t, i) => {
        const lastOdd = i === tiles.length - 1 && tiles.length % 2 === 1;
        return (
          <Meta key={t.label} label={t.label} value={t.value} className={cn(lastOdd && 'col-span-2')} />
        );
      })}
    </div>
  );
}

/** Version 2 — the single clicked entry (Fortsetzung, Noch zu schauen, Am Schauen). */
function EntryStats({ a, row }: { a: JikanAnime; row: AnimeRow }) {
  const isMovie = row.format === 'movie' || (a.type ?? '').toLowerCase() === 'movie';
  return (
    <div className="my-4 grid grid-cols-3 gap-2 text-left">
      <Meta label="Score" value={a.score ? `★ ${a.score}` : '—'} />
      {isMovie ? (
        <Meta label="Dauer" value={formatDuration(a.duration)} />
      ) : (
        <Meta label="Folgen" value={a.episodes ? String(a.episodes) : '—'} />
      )}
      <Meta label="Typ" value={typeLabel(a.type, row.format)} />
    </div>
  );
}

function TileSkeletons({ count }: { count: number }) {
  return (
    <div className="my-4 grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

function Meta({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-white/5 bg-white/[0.03] p-3', className)}>
      <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="mt-0.5 block font-extrabold">{value}</span>
    </div>
  );
}

function formatLabel(format: AnimeFormat): string {
  return format === 'movie' ? 'Film' : format === 'season' ? 'Staffel' : 'Abgeschlossen';
}

/** Maps a Jikan type (falling back to the stored format) to a German label. */
function typeLabel(type: string | null | undefined, format: AnimeFormat | null): string {
  switch ((type ?? '').toLowerCase()) {
    case 'tv':
      return 'Staffel';
    case 'movie':
      return 'Film';
    case 'ova':
      return 'OVA';
    case 'ona':
      return 'ONA';
    case 'special':
    case 'tv special':
      return 'Special';
    case 'music':
      return 'Music';
  }
  return format ? formatLabel(format) : '—';
}

/** Tidies Jikan's duration string ("1 hr 47 min per ep") into German. */
function formatDuration(duration: string | null | undefined): string {
  if (!duration) return '—';
  const cleaned = duration
    .replace(/per ep/i, '')
    .replace(/\bhr\b/i, 'Std.')
    .replace(/\bmin\b/i, 'Min.')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || '—';
}
