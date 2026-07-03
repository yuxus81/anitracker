import { useState } from 'react';
import type { ReactNode } from 'react';
import { useGroupedAnimes, useDeleteAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { useUIStore, toast } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { categoryTheme, type CategoryTheme } from '@/theme/categoryTheme';
import { useThemeGlow } from '@/theme/useThemeGlow';
import { cn } from '@/utils/cn';
import type { AnimeRow } from '@/types/db';
import { HubCard, HubIconBtn } from './HubCard';

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
  const openDetail = useDetailStore((s) => s.open);
  const openFranchise = useFranchiseStore((s) => s.open);
  const del = useDeleteAnime();
  const update = useUpdateAnime();
  const [onlyLimbo, setOnlyLimbo] = useState(false);

  useThemeGlow(categoryTheme.gesehen.accentHex);

  const watched = grouped.watched; // active | dead | limbo (superseded excluded)
  const limboCount = watched.filter((a) => a.status === 'limbo').length;
  const seen = onlyLimbo ? watched.filter((a) => a.status === 'limbo') : watched;
  const waiting = onlyLimbo ? [] : grouped.nextSeason.filter((a) => !a.is_released);
  const releases = onlyLimbo ? [] : grouped.nextSeason.filter((a) => a.is_released);

  const isEmpty = watched.length === 0 && grouped.nextSeason.length === 0;

  function themeFor(a: AnimeRow): CategoryTheme {
    return a.status === 'limbo' ? categoryTheme.suchtNeuigkeiten : categoryTheme.gesehen;
  }

  function markReleased(a: AnimeRow) {
    update.mutate({
      id: a.id,
      patch: {
        is_released: true,
        last_updated_at: new Date().toISOString(),
        release_label: 'Verfügbar',
      },
    });
    toast.success(`„${a.title}" als erschienen markiert`, '🔥');
  }

  function startWatching(a: AnimeRow) {
    update.mutate({
      id: a.id,
      patch: {
        category: 'current',
        status: 'active',
        is_released: false,
        is_placeholder: false,
        sort_order: Date.now(),
      },
    });
    toast.success(`„${a.title}" ist jetzt in „Am Schauen"`, '▶️');
  }

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
                  const t = themeFor(a);
                  return (
                    <HubCard
                      key={a.id}
                      anime={a}
                      theme={t}
                      index={i}
                      onOpen={a.mal_id ? () => openDetail(a.mal_id!) : undefined}
                      chip={
                        a.status === 'limbo' ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold animate-radar',
                              t.chip,
                            )}
                          >
                            🔎 Sucht Neuigkeiten
                          </span>
                        ) : (
                          <Chip theme={t}>✅ Gesehen</Chip>
                        )
                      }
                      actions={
                        <>
                          <HubIconBtn
                            label="Fortsetzung prüfen"
                            onClick={() =>
                              openFranchise({
                                malId: a.mal_id,
                                title: a.title,
                                coverUrl: a.cover_url,
                                existingId: a.id,
                              })
                            }
                          >
                            🔮
                          </HubIconBtn>
                          <HubIconBtn label="Entfernen" onClick={() => del.mutate(a.id)}>
                            🗑️
                          </HubIconBtn>
                        </>
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
                    onOpen={a.mal_id ? () => openDetail(a.mal_id!) : undefined}
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
                    actions={
                      <>
                        <HubIconBtn label="Als erschienen markieren" onClick={() => markReleased(a)}>
                          ✅
                        </HubIconBtn>
                        <HubIconBtn label="Entfernen" onClick={() => del.mutate(a.id)}>
                          🗑️
                        </HubIconBtn>
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
                    onOpen={a.mal_id ? () => openDetail(a.mal_id!) : undefined}
                    chip={<Chip theme={categoryTheme.neuerscheinung}>✨ Jetzt verfügbar</Chip>}
                    actions={
                      <>
                        <HubIconBtn label="Jetzt schauen" onClick={() => startWatching(a)}>
                          ▶️
                        </HubIconBtn>
                        <HubIconBtn label="Entfernen" onClick={() => del.mutate(a.id)}>
                          🗑️
                        </HubIconBtn>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
