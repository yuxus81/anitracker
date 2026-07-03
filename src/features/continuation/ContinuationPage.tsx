import { useGroupedAnimes } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useUIStore } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { categoryTheme } from '@/theme/categoryTheme';
import { cn } from '@/utils/cn';
import type { AnimeRow } from '@/types/db';
import { HubCard } from '@/features/watched/HubCard';

const theme = categoryTheme.fortsetzung;

function formatLabel(a: AnimeRow): string | null {
  return a.format === 'movie' ? '🎬 Film' : a.format === 'season' ? '📺 Neue Staffel' : null;
}

/**
 * Dedicated "Fortsetzung folgt" page: only the purple entries whose continuation
 * is announced but not yet released. Released ones live on Geschaut & Home.
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
        <div className="flex flex-col gap-3">
          {waiting.map((a, i) => {
            const fmt = formatLabel(a);
            return (
              <HubCard
                key={a.id}
                anime={a}
                theme={theme}
                index={i}
                onOpen={() => openRow(a)}
                chip={
                  <>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
                        theme.chip,
                      )}
                    >
                      🗓️ {a.release_label ?? 'Datum unbekannt'}
                    </span>
                    {fmt && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.65rem] font-bold text-muted">
                        {fmt}
                      </span>
                    )}
                    {a.is_placeholder && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
                          categoryTheme.neuerscheinung.chip,
                        )}
                      >
                        ⏳ Platzhalter
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
