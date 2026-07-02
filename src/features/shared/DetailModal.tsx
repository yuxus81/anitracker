import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { qk } from '@/lib/queryClient';
import { jikanApi } from '@/api/jikan';
import { getBestTitle, getCover } from '@/utils/titles';
import { useDetailStore } from './detailStore';
import { useAddAnime, useAnimesQuery } from '@/hooks/useAnimes';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { toast } from '@/store/ui';

export function DetailModal() {
  const malId = useDetailStore((s) => s.malId);
  const close = useDetailStore((s) => s.close);
  const openFranchise = useFranchiseStore((s) => s.open);
  const addAnime = useAddAnime();
  const { data: animes } = useAnimesQuery();

  const detail = useQuery({
    queryKey: malId ? qk.animeDetail(malId) : ['anime-detail', 'none'],
    enabled: malId !== null,
    queryFn: async ({ signal }) => (await jikanApi.getAnimeFull(malId!, signal)).data,
  });

  const tracked = animes?.find((a) => a.mal_id === malId);
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
    close();
  }

  function markWatched() {
    if (!a) return;
    close();
    openFranchise({ malId: a.mal_id, title: getBestTitle(a), coverUrl: getCover(a) });
  }

  return (
    <Modal open={malId !== null} onClose={close} size="md">
      {detail.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="mx-auto h-64 w-44 rounded-2xl" />
          <Skeleton className="mx-auto h-6 w-2/3 rounded" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : detail.isError || !a ? (
        <ErrorState onRetry={() => detail.refetch()} />
      ) : (
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

          {a.synopsis && (
            <p className="mb-5 max-h-40 overflow-y-auto text-left text-sm leading-relaxed text-muted">
              {a.synopsis}
            </p>
          )}

          {tracked ? (
            <div className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-muted">
              Bereits in deiner Sammlung ({categoryLabel(tracked.category)})
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="primary" fullWidth loading={addAnime.isPending} onClick={addToWatchlist}>
                🔖 Zur Watchlist hinzufügen
              </Button>
              <Button variant="neon" fullWidth onClick={markWatched}>
                ✅ Schon gesehen
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
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

function categoryLabel(c: string): string {
  return c === 'watched'
    ? 'Geschaut'
    : c === 'watchlist'
      ? 'Watchlist'
      : c === 'current'
        ? 'Am Schauen'
        : 'Fortsetzung folgt';
}
