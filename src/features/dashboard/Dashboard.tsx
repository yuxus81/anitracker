import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useGroupedAnimes } from '@/hooks/useAnimes';
import { useAuth } from '@/features/auth/AuthProvider';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { NeonTicket } from '@/features/current/NeonTicket';
import { ReleaseCard } from '@/features/continuation/ReleaseCard';
import { useUIStore } from '@/store/ui';

export function Dashboard() {
  const { username } = useAuth();
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const openAddModal = useUIStore((s) => s.openAddModal);

  const released = grouped.nextSeason.filter((a) => a.is_released);

  return (
    <div className="mx-auto max-w-[950px] animate-stagger">
      <p className="mb-5 text-lg font-bold sm:hidden">
        Hi <span className="text-muted">{username || 'du'}</span> 👋
      </p>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton count={3} />
      ) : (
        <>
          {/* Bento grid */}
          <div className="mb-8 grid grid-cols-2 gap-3.5" style={{ gridAutoRows: 'minmax(110px,auto)' }}>
            <Link
              to="/watched"
              className="col-span-1 row-span-2 flex flex-col items-center justify-center rounded-xl2 border border-green/20 bg-gradient-to-br from-green/15 to-green/[0.02] p-6 text-center shadow-card transition hover:-translate-y-1"
            >
              <span className="text-4xl text-green" aria-hidden>
                📚
              </span>
              <h3 className="mt-2 text-5xl font-extrabold leading-none text-green">
                {grouped.counts.watched}
              </h3>
              <span className="mt-1 text-xs font-bold uppercase tracking-wide text-green">
                Geschaut
              </span>
            </Link>

            <BentoRow
              to="/current"
              icon="▶️"
              label="Gerade am Schauen"
              count={grouped.counts.current}
              color="neon"
            />
            <BentoRow
              to="/continuation"
              icon="🔮"
              label="Fortsetzung folgt"
              count={grouped.counts.nextSeason}
              color="purple"
            />
            <Link
              to="/discover"
              className="col-span-2 flex items-center gap-3 rounded-xl2 border border-blue/30 bg-gradient-to-br from-blue/10 to-blue/[0.02] p-5 shadow-card transition hover:-translate-y-1"
            >
              <span className="text-2xl text-blue" aria-hidden>
                🧭
              </span>
              <span className="font-bold">Neue Animes entdecken</span>
              <span className="ml-auto text-blue">→</span>
            </Link>
          </div>

          {/* Gerade am Schauen */}
          <SectionTitle icon="▶️">Gerade am Schauen</SectionTitle>
          {grouped.current.length === 0 ? (
            <EmptyState
              title="Nichts am Laufen"
              hint="Füge eine Serie hinzu, die du gerade schaust."
              action={
                <button className="link" onClick={() => openAddModal('current')}>
                  + Serie hinzufügen
                </button>
              }
            />
          ) : (
            <div className="mb-8 flex flex-col gap-3">
              {grouped.current.slice(0, 4).map((a) => (
                <NeonTicket key={a.id} anime={a} />
              ))}
            </div>
          )}

          {/* Noch zu schauen (released continuations) */}
          <SectionTitle icon="🔥">Noch zu schauen</SectionTitle>
          {released.length === 0 ? (
            <EmptyState
              title="Keine neuen Releases"
              hint="Sobald eine verfolgte Fortsetzung erscheint, taucht sie hier auf."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {released.map((a) => (
                <ReleaseCard key={a.id} anime={a} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BentoRow({
  to,
  icon,
  label,
  count,
  color,
}: {
  to: string;
  icon: string;
  label: string;
  count: number;
  color: 'neon' | 'purple';
}) {
  const styles =
    color === 'neon'
      ? 'border-accent-neon/30 from-accent-neon/10 to-accent-neon/[0.02] text-accent-neon'
      : 'border-accent-purple/30 from-accent-purple/10 to-accent-purple/[0.02] text-[#c18eff]';
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 rounded-xl2 border bg-gradient-to-br p-4 shadow-card transition hover:-translate-y-1 ${styles}`}
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-sm font-bold leading-tight text-ink">{label}</span>
      <span className="absolute right-3 top-3 rounded-lg bg-white px-2 py-0.5 text-xs font-extrabold text-accent-purple">
        {count}
      </span>
    </Link>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h3 className="mb-4 mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
      <span aria-hidden>{icon}</span>
      {children}
    </h3>
  );
}
