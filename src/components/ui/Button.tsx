import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'neon' | 'ghost' | 'danger' | 'white' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-accent-purple to-blue text-white shadow-[0_4px_15px_rgba(138,43,226,0.35)] hover:brightness-110',
  neon: 'bg-accent-neon/15 text-accent-neon border border-accent-neon/40 hover:bg-accent-neon hover:text-bg',
  ghost: 'bg-white/5 text-ink border border-white/10 hover:bg-white/10',
  outline:
    'bg-accent-purple/5 text-white border border-accent-purple/50 hover:bg-accent-purple/20',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-white',
  white: 'bg-white text-black hover:brightness-90',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-sm px-5 py-3',
  lg: 'text-base px-6 py-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin-slow"
        />
      )}
      {children}
    </button>
  );
});
