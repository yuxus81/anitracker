import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type ActionVariant = 'neon' | 'purple' | 'danger';

/**
 * Modern, solid action button for popups. Positive actions are gradient-filled
 * in the app's accent colors (crisp, high-contrast); destructive stays quiet and
 * tinted so it never competes with the primary action. No glassmorphism.
 */
const VARIANTS: Record<ActionVariant, string> = {
  neon: 'bg-gradient-to-br from-accent-neon to-[#00bfa8] text-[#04231f] shadow-[0_8px_20px_-10px_rgba(0,245,212,0.9)] hover:brightness-110',
  purple:
    'bg-gradient-to-br from-accent-purple to-blue text-white shadow-[0_8px_20px_-10px_rgba(138,43,226,0.9)] hover:brightness-110',
  danger: 'border border-danger/30 bg-danger/[0.12] text-[#ff8791] hover:bg-danger/20',
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
