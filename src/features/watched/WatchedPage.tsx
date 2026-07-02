import { useState } from 'react';
import type { ReactNode } from 'react';
import { useGroupedAnimes, useDeleteAnime } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { useUIStore } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { AnimeRow, AnimeStatus } from '@/types/db';

type StatusMeta = { label: string; icon: string; badge: string };

const STATUS_META: Partial<Record<AnimeStatus, StatusMeta>> = {
  limbo: { label: 'Sucht Neuigkeiten', icon: '🔎', badge: 'text-orange border-orange/40 bg-orange/10' },
  active: { label: 'Gesehen', icon: '✅', badge: 'text-green border-green/40 bg-green/10' },
  dead: { label: 'Abgeschlossen', icon: '🏁', badge: 'text-muted border-white/15 bg-white/5' },
};

const SECTION_ORDER: Array<{ status: AnimeStatus; title: string }> = [
  { status: 'limbo', title: '🔎 Sucht Neuigkeiten' },
  { status: 'active', title: '✅ Gesehen' },
  { status: 'dead', title: '🏁 Abgeschlossen' },
];

export function WatchedPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const [onlyLimbo, setOnlyLimbo] = useState(false);

  const watched = grouped.watched;
  const limboCount = watched.filter((a) => a.status === 'limbo').length;

  return (
    <div className="animate-stagger">
      <PageHeader
        title="Geschaut"
        count={grouped.counts.watched}
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
            'mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition',
            onlyLimbo
              ? 'border-orange bg-orange/15 text-orange'
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
      ) : watched.length === 0 ? (
        <EmptyState
          title="Noch nichts als gesehen markiert"
          hint="Schließe eine Serie ab oder füge sie direkt hier hinzu."
          action={
            <button className="link" onClick={() => openAddModal('watched')}>
              + Anime hinzufügen
            </button>
          }
        />
      ) : (
        SECTION_ORDER.filter((s) => !onlyLimbo || s.status === 'limbo').map((section) => {
          const items = watched.filter((a) => a.status === section.status);
          if (items.length === 0) return null;
          return (
            <section key={section.status} className="mb-7">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                {section.title} · {items.length}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <WatchedCard key={a.id} anime={a} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function WatchedCard({ anime }: { anime: AnimeRow }) {
  const del = useDeleteAnime();
  const openDetail = useDetailStore((s) => s.open);
  const openFranchise = useFranchiseStore((s) => s.open);
  const meta = STATUS_META[anime.status] ?? STATUS_META.active!;

  return (
    <div className="flex items-center gap-3 rounded-xl2 border border-white/5 bg-card p-2.5 shadow-card">
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
          <div className="grid h-[72px] w-[50px] place-items-center rounded-lg bg-white/5">🎬</div>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{anime.title}</p>
        <span
          className={cn(
            'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
            meta.badge,
          )}
        >
          {meta.icon} {meta.label}
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <IconBtn
          label="Fortsetzung prüfen"
          onClick={() =>
            openFranchise({
              malId: anime.mal_id,
              title: anime.title,
              coverUrl: anime.cover_url,
              existingId: anime.id,
            })
          }
        >
          🔮
        </IconBtn>
        <IconBtn label="Entfernen" onClick={() => del.mutate(anime.id)}>
          🗑️
        </IconBtn>
      </div>
    </div>
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
