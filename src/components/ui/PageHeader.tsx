import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { categoryTheme, type CategoryKey } from '@/theme/categoryTheme';

interface PageHeaderProps {
  title: string;
  count?: number;
  /** Colors the count badge with a category identity. Defaults to purple. */
  accent?: CategoryKey;
  action?: ReactNode;
}

export function PageHeader({ title, count, accent, action }: PageHeaderProps) {
  const badge = accent
    ? categoryTheme[accent].chip
    : 'text-accent-purple border-accent-purple/30 bg-accent-purple/15';

  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4 pt-2">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight md:text-3xl">
        {title}
        {count !== undefined && (
          <span className={cn('rounded-full border px-2.5 py-0.5 text-sm font-bold', badge)}>
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
