import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useGroupedAnimes } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useUIStore } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { RepairModal } from '@/features/maintenance/RepairModal';
import { scanLibrary } from '@/features/maintenance/repair';
import { categoryTheme, type CategoryTheme } from '@/theme/categoryTheme';
import { cn } from '@/utils/cn';
import { HubCard } from './HubCard';

function Chip({ theme, children }: { theme: CategoryTheme; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
        theme.chip,
      )}
    >
      {children}
    </span>
  );
}

function SectionHead({ theme, count }: { theme: CategoryTheme; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', theme.dot)} aria-hidden />
      <h3 className={cn('text-xs font-bold uppercase tracking-wide', theme.text)}>{theme.label}</h3>
      <span className="text-[0.7rem] text-muted">{count}</span>
    </div>
  );
}

export function WatchedPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const openRow = useDetailStore((s) => s.openRow);
  const [onlyLimbo, setOnlyLimbo] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);

  const watched = grouped.watched; // active | dead | limbo (superseded excluded)
  const limboCount = watched.filter((a) => a.status === 'limbo').length;
  const seen = onlyLimbo ? watched.filter((a) => a.status === 'limbo') : watched;
  const waiting = onlyLimbo ? [] : grouped.nextSeason.filter((a) => !a.is_released);
  const releases = onlyLimbo ? [] : grouped.nextSeason.filter((a) => a.is_released);

  const isEmpty = watched.length === 0 && grouped.nextSeason.length === 0;

  // Surface library problems (missing covers / duplicates) right where they show.
  const report = useMemo(() => scanLibrary(grouped.all), [grouped.all]);
  const dupeRows = report.duplicates.reduce((n, g) => n + g.remove.length, 0);
  const problemCount = report.missingCovers.length + dupeRows;

  return (
    <div className="page-fade">
      <PageHeader
        title="Geschaut"
        count={grouped.counts.watched}
        accent="gesehen"
        action={
          <Button size="sm" variant="ghost" onClick={() => openAddModal('watched')}>
            + Hinzufügen
          </Button>
        }
      />

      {problemCount > 0 && (
        <button
          type="button"
          onClick={() => setRepairOpen(true)}
          className="hover-press mb-4 flex w-full items-center gap-2 rounded-xl border border-orange/30 bg-orange/10 px-4 py-2.5 text-left text-sm font-semibold text-[#ff5c8a] transition hover:bg-orange/15"
        >
          🧹
          <span className="min-w-0 flex-1">
            {report.missingCovers.length > 0 && `${report.missingCovers.length} Cover fehlen`}
            {report.missingCovers.length > 0 && dupeRows > 0 && ' · '}
            {dupeRows > 0 && `${dupeRows} Duplikate`}
          </span>
          <span className="flex-shrink-0 text-xs opacity-80">Bereinigen ›</span>
        </button>
      )}

      {limboCount > 0 && (
        <button
          type="button"
          onClick={() => setOnlyLimbo((v) => !v)}
          className={cn(
            'hover-press mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition',
            onlyLimbo
              ? 'border-accent-neon bg-accent-neon/15 text-accent-neon'
              : 'border-white/10 bg-white/5 text-muted hover:text-white',
          )}
        >
          🔎 Nur „Sucht Neuigkeiten" ({limboCount})
        </button>
      )}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton count={5} />
      ) : isEmpty ? (
        <EmptyState
          title="Deine Bibliothek ist leer"
          hint="Schließe eine Serie ab oder füge sie direkt hier hinzu."
          action={
            <button className="link" onClick={() => openAddModal('watched')}>
              + Anime hinzufügen
            </button>
          }
        />
      ) : (
        <>
          {seen.length > 0 && (
            <section className="mb-7">
              <SectionHead theme={categoryTheme.gesehen} count={watched.length} />
              <div className="flex flex-col gap-3">
                {seen.map((a, i) => {
                  const isLimbo = a.status === 'limbo';
                  const t = isLimbo ? categoryTheme.suchtNeuigkeiten : categoryTheme.gesehen;
                  return (
                    <HubCard
                      key={a.id}
                      anime={a}
                      theme={t}
                      index={i}
                      onOpen={() => openRow(a)}
                      chip={
                        isLimbo ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold animate-radar',
                              t.chip,
                            )}
                          >
                            🔎 Sucht Neuigkeiten
                          </span>
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {waiting.length > 0 && (
            <section className="mb-7">
              <SectionHead theme={categoryTheme.fortsetzung} count={waiting.length} />
              <div className="flex flex-col gap-3">
                {waiting.map((a, i) => (
                  <HubCard
                    key={a.id}
                    anime={a}
                    theme={categoryTheme.fortsetzung}
                    index={i}
                    onOpen={() => openRow(a)}
                    chip={
                      <>
                        <Chip theme={categoryTheme.fortsetzung}>
                          {a.release_label ?? 'Datum unbekannt'}
                        </Chip>
                        {a.is_placeholder && (
                          <Chip theme={categoryTheme.neuerscheinung}>⏳ Platzhalter</Chip>
                        )}
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {releases.length > 0 && (
            <section>
              <SectionHead theme={categoryTheme.neuerscheinung} count={releases.length} />
              <div className="flex flex-col gap-3">
                {releases.map((a, i) => (
                  <HubCard
                    key={a.id}
                    anime={a}
                    theme={categoryTheme.neuerscheinung}
                    index={i}
                    sheen
                    onOpen={() => openRow(a)}
                    chip={
                      <Chip theme={categoryTheme.neuerscheinung}>
                        {a.release_label ?? 'Verfügbar'}
                      </Chip>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <RepairModal open={repairOpen} onClose={() => setRepairOpen(false)} />
    </div>
  );
}
