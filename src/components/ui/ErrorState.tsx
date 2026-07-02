import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Visible, actionable error surface — never fail silently. */
export function ErrorState({
  title = 'Etwas ist schiefgelaufen',
  message = 'Bitte versuche es erneut. Wenn es an der Anime-API liegt, kann sie kurz überlastet sein.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="w-full rounded-xl2 border border-danger/30 bg-danger/5 px-6 py-8 text-center"
    >
      <div className="mb-2 text-3xl" aria-hidden>
        ⚠️
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <div className="mt-5 flex justify-center">
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Erneut versuchen
          </Button>
        </div>
      )}
    </div>
  );
}
