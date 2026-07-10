import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional heading shown centered at the top. */
  title?: ReactNode;
  /** Shows a back-chevron (for nested modals) and calls this instead of just closing. */
  onBack?: () => void;
  /** Constrain width; defaults to a comfortable mobile-first sheet. */
  size?: 'sm' | 'md' | 'lg';
  labelledBy?: string;
  className?: string;
  /** Optional ambient layer (e.g. a themed ParticleField) painted behind content. */
  atmosphere?: ReactNode;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const;

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  children,
  title,
  onBack,
  size = 'md',
  labelledBy,
  className,
  atmosphere,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Keep the latest callbacks in refs so the focus/trap effect can depend on
  // `open` alone. Depending on the callbacks made the effect re-run on every
  // parent render (e.g. each keystroke in a search field), which stole focus
  // back to the ✕ button and kicked the user out of the input.
  const onCloseRef = useRef(onClose);
  const onBackRef = useRef(onBack);
  onCloseRef.current = onClose;
  onBackRef.current = onBack;

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;

    // Focus a text input if the panel has one (search fields etc.), otherwise
    // the first focusable element. Runs once per open — never on re-render.
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>('input,textarea') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        (onBackRef.current ?? onCloseRef.current)();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;

      // Focus trap.
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'relative w-full bg-card rounded-xl3 px-3.5 py-7 shadow-modal border border-white/10',
          'max-h-[85dvh] flex flex-col animate-modal-pop',
          sizes[size],
          className,
        )}
      >
        {atmosphere && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl3">
            {atmosphere}
          </div>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Zurück"
            className="absolute left-5 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-accent-purple/10 border border-accent-purple/35 text-accent-purple hover:bg-accent-purple hover:text-white transition"
          >
            <span aria-hidden>‹</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-5 top-5 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white hover:text-black transition"
        >
          <span aria-hidden>✕</span>
        </button>

        {title && (
          <h3 id={labelledBy} className="relative z-10 mt-2 mb-5 text-center text-xl font-extrabold px-8">
            {title}
          </h3>
        )}

        <div className="relative z-10 overflow-y-auto flex-1 px-3.5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
