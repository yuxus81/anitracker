import { createPortal } from 'react-dom';
import { useUIStore, type ToastVariant } from '@/store/ui';
import { cn } from '@/utils/cn';

const variantStyles: Record<ToastVariant, string> = {
  default: 'from-[#a04ef6] to-accent-purple text-white',
  success: 'from-green to-accent-neon text-black',
  error: 'from-danger to-orange text-white',
  info: 'from-blue to-accent-neon text-black',
};

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] flex flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top)+12px)] px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg',
            'bg-gradient-to-r animate-toast-in max-w-[92vw]',
            variantStyles[t.variant],
          )}
        >
          {t.icon && <span aria-hidden>{t.icon}</span>}
          <span className="truncate">{t.message}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
