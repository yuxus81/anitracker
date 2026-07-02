import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  count?: number;
  action?: ReactNode;
}

export function PageHeader({ title, count, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4 pt-2">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight md:text-3xl">
        {title}
        {count !== undefined && (
          <span className="rounded-full border border-accent-purple/30 bg-accent-purple/15 px-2.5 py-0.5 text-sm font-bold text-accent-purple">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
