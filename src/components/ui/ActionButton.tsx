import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type ActionVariant = 'neon' | 'purple' | 'danger';

/**
 * Neon-outline action button for popups. No solid color fill — each variant is a
 * translucent tint behind a glowing colored hairline, with the label in the
 * accent color itself. Reads as a quiet neon sign rather than a candy-filled
 * button; the soft outer glow gives depth without shouting.
 */
const VARIANTS: Record<ActionVariant, string> = {
  neon: 'border border-accent-neon/50 bg-accent-neon/10 text-accent-neon shadow-[0_0_22px_-8px_rgba(0,245,212,0.75)] hover:bg-accent-neon/[0.18] hover:border-accent-neon',
  purple:
    'border border-accent-purple/55 bg-accent-purple/10 text-[#c9a8ff] shadow-[0_0_22px_-8px_rgba(138,43,226,0.75)] hover:bg-accent-purple/[0.18] hover:border-accent-purple',
  danger:
    'border border-danger/40 bg-danger/10 text-[#ff8791] shadow-[0_0_22px_-10px_rgba(255,71,87,0.7)] hover:bg-danger/[0.18] hover:border-danger/60',
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  loading?: boolean;
  children: ReactNode;
}

export function ActionButton({
  variant = 'neon',
  loading = false,
  children,
  className,
  disabled,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-bold leading-tight',
        'transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin-slow rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        children
      )}
    </button>
  );
}
