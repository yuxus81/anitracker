import type { ReactNode } from 'react';
import type { AnimeRow } from '@/types/db';
import type { CategoryTheme } from '@/theme/categoryTheme';
import { FilmIcon } from '@/components/icons/CategoryIcons';
import { cn } from '@/utils/cn';

export interface HubCardProps {
  anime: AnimeRow;
  theme: CategoryTheme;
  /** Optional status/date chip row. Omit for a clean cover + title tile. */
  chip?: ReactNode;
  /** Position in its section, drives the staggered entrance delay. */
  index?: number;
  /** One-time celebratory glow on mount (for new releases). */
  sheen?: boolean;
  /** Opens the context popup — the whole card is the tap target. */
  onOpen: () => void;
}

export function HubCard({ anime, theme, chip, index = 0, sheen, onOpen }: HubCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Details zu ${anime.title}`}
      className={cn(
        'hover-lift flex w-full items-center gap-3.5 rounded-xl2 border p-3 text-left shadow-card',
        sheen ? 'animate-sheen' : 'hub-card',
        theme.tint,
      )}
      style={{ animationDelay: `${Math.min(index, 10) * 60}ms` }}
    >
      <span className={cn('h-[128px] w-[4px] flex-shrink-0 rounded-full', theme.bar)} aria-hidden />

      {anime.cover_url ? (
        <img
          src={anime.cover_url}
          alt=""
          loading="lazy"
          className="h-[128px] w-[90px] flex-shrink-0 rounded-xl object-cover shadow-card"
        />
      ) : (
        <span
          className={cn(
            'grid h-[128px] w-[90px] flex-shrink-0 place-items-center rounded-xl border',
            theme.tint,
            theme.text,
          )}
        >
          <FilmIcon className="h-9 w-9" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-base font-bold leading-snug">{anime.title}</p>
        {chip && <div className="mt-2 flex flex-wrap items-center gap-1.5">{chip}</div>}
      </div>

      <span className="flex-shrink-0 pr-1 text-xl text-muted/50" aria-hidden>
        ›
      </span>
    </button>
  );
}
