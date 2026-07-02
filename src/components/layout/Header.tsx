import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';

export function Header() {
  const { username } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-4 md:px-10">
      <Link to="/" className="flex items-center gap-3 transition hover:scale-[1.03]">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent-purple to-blue text-xl shadow-glow-purple">
          🎬
        </span>
        <span className="text-2xl font-bold tracking-tight">AniTracker</span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-xs text-muted">Angemeldet als</span>
          <b className="text-sm">{username || '…'}</b>
        </div>
        <button
          type="button"
          aria-label="Einstellungen"
          onClick={() => navigate('/settings')}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden>⚙️</span>
        </button>
      </div>
    </header>
  );
}
