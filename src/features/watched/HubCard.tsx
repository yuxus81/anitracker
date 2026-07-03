import type { ReactNode } from 'react';
import type { AnimeRow } from '@/types/db';
import type { CategoryTheme } from '@/theme/categoryTheme';
import { FilmIcon } from '@/components/icons/CategoryIcons';
import { cn } from '@/utils/cn';

export interface HubCardProps {
  anime: AnimeRow;
  theme: CategoryTheme;
  chip: ReactNode;
  actions: ReactNode;
  /** Position in its section, drives the staggered entrance delay. */
  index?: number;
  /** One-time celebratory glow on mount (for new releases). */
  sheen?: boolean;
  onOpen?: () => void;
}

export function HubCard({ anime, theme, chip, actions, index = 0, sheen, onOpen }: HubCardProps) {
  return (
    <div
      className={cn(
        'hover-lift flex items-center gap-3 rounded-xl2 border p-2.5 shadow-card',
        sheen ? 'animate-sheen' : 'hub-card',
        theme.tint,
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <span className={cn('h-14 w-[3px] flex-shrink-0 rounded-full', theme.bar)} aria-hidden />

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
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
          <span
            className={cn(
              'grid h-[72px] w-[50px] place-items-center rounded-lg border',
              theme.tint,
              theme.text,
            )}
          >
            <FilmIcon className="h-6 w-6" />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{anime.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">{chip}</div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

export function HubIconBtn({
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
      className="hover-press grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-base transition hover:bg-white/10"
    >
      {children}
    </button>
  );
}
