import { useGroupedAnimes } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useUIStore } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { ContinuationCard } from './ContinuationCard';

/**
 * Dedicated "Fortsetzung folgt" page: only the purple entries whose continuation
 * is announced but not yet released. Released ones live on Geschaut & Home.
 * Laid out as a distinct info-forward grid (not the Watchlist poster grid).
 */
export function ContinuationPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const openRow = useDetailStore((s) => s.openRow);

  const waiting = grouped.nextSeason.filter((a) => !a.is_released);

  return (
    <div className="page-fade">
      <PageHeader
        title="Fortsetzung folgt"
        count={waiting.length}
        accent="fortsetzung"
        action={
          <Button size="sm" variant="ghost" onClick={() => openAddModal('next_season')}>
            + Hinzufügen
          </Button>
        }
      />

      <p className="mb-5 text-sm text-muted">
        Angekündigte Fortsetzungen, die noch nicht draußen sind — täglich auf Release geprüft.
      </p>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton count={4} />
      ) : waiting.length === 0 ? (
        <EmptyState
          title="Keine offenen Fortsetzungen"
          hint="Schließ eine Serie ab — die nächste Staffel landet automatisch hier, sobald sie angekündigt ist."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {waiting.map((a, i) => (
            <ContinuationCard key={a.id} anime={a} index={i} onOpen={() => openRow(a)} />
          ))}
        </div>
      )}
    </div>
  );
}
