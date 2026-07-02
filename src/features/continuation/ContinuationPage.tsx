import type { ReactNode } from 'react';
import { useGroupedAnimes, useDeleteAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useUIStore, toast } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { AnimeRow } from '@/types/db';
import { ReleaseCard } from './ReleaseCard';

export function ContinuationPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const openAddModal = useUIStore((s) => s.openAddModal);

  const released = grouped.nextSeason.filter((a) => a.is_released);
  const waiting = grouped.nextSeason.filter((a) => !a.is_released);

  return (
    <div className="animate-stagger">
      <PageHeader
        title="Fortsetzung folgt"
        count={grouped.counts.nextSeason}
        action={
          <Button size="sm" variant="ghost" onClick={() => openAddModal('next_season')}>
            + Hinzufügen
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton count={4} />
      ) : grouped.nextSeason.length === 0 ? (
        <EmptyState
          title="Keine offenen Fortsetzungen"
          hint="Schließ eine Serie ab — die nächste Staffel landet automatisch hier und wird täglich auf Release geprüft."
        />
      ) : (
        <>
          {released.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange">
                🔥 Jetzt verfügbar · {released.length}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {released.map((a) => (
                  <ReleaseCard key={a.id} anime={a} />
                ))}
              </div>
            </section>
          )}

          {waiting.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                ⏳ Wird beobachtet · {waiting.length}
              </h3>
              <div className="flex flex-col gap-3">
                {waiting.map((a) => (
                  <WaitingCard key={a.id} anime={a} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WaitingCard({ anime }: { anime: AnimeRow }) {
  const del = useDeleteAnime();
  const update = useUpdateAnime();
  const openDetail = useDetailStore((s) => s.open);

  const formatLabel = anime.format === 'movie' ? '🎬 Film' : anime.format === 'season' ? '📺 Staffel' : null;

  function markReleased() {
    update.mutate({
      id: anime.id,
      patch: {
        is_released: true,
        last_updated_at: new Date().toISOString(),
        release_label: 'Verfügbar',
      },
    });
    toast.success(`„${anime.title}" als erschienen markiert`, '🔥');
  }

  return (
    <div className="flex items-center gap-3 rounded-xl2 border border-accent-purple/20 bg-card p-2.5 shadow-card">
      <button
        type="button"
        onClick={() => anime.mal_id && openDetail(anime.mal_id)}
        disabled={!anime.mal_id}
        aria-label={`Details zu ${anime.title}`}
        className="flex-shrink-0"
      >
        {anime.cover_url ? (
          <img
            src={anime.cover_url}
            alt=""
            loading="lazy"
            className="h-[72px] w-[50px] rounded-lg object-cover"
          />
        ) : (
          <div className="grid h-[72px] w-[50px] place-items-center rounded-lg bg-white/5">🔮</div>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{anime.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge className="border-accent-purple/30 bg-accent-purple/10 text-[#c18eff]">
            {anime.release_label ?? 'Datum unbekannt'}
          </Badge>
          {formatLabel && <Badge>{formatLabel}</Badge>}
          {anime.is_placeholder && (
            <Badge className="border-orange/30 bg-orange/10 text-orange">⏳ Platzhalter</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <IconBtn label="Als erschienen markieren" onClick={markReleased}>
          ✅
        </IconBtn>
        <IconBtn label="Entfernen" onClick={() => del.mutate(anime.id)}>
          🗑️
        </IconBtn>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
        className ?? 'border-white/15 bg-white/5 text-muted',
      )}
    >
      {children}
    </span>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-base transition hover:bg-white/10"
    >
      {children}
    </button>
  );
}
