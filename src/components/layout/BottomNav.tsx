import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui';
import type { AnimeCategory } from '@/types/db';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Which list the FAB should preset to when this route is active. */
  addPreset?: AnimeCategory;
}

const LEFT: NavItem[] = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/watched', label: 'Geschaut', icon: '✅', addPreset: 'watched' },
];
const RIGHT: NavItem[] = [
  { to: '/watchlist', label: 'Watchlist', icon: '🔖', addPreset: 'watchlist' },
  { to: '/discover', label: 'Entdecken', icon: '🧭' },
];

/** Maps the current route to the list the FAB should add into. */
const ROUTE_PRESET: Record<string, AnimeCategory> = {
  '/watched': 'watched',
  '/watchlist': 'watchlist',
  '/current': 'current',
  '/continuation': 'next_season',
};

export function BottomNav() {
  const openAddModal = useUIStore((s) => s.openAddModal);
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1500] grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-white/5 bg-[rgba(10,12,19,0.95)] pb-safe backdrop-blur-xl">
      {LEFT.map((item) => (
        <NavItemLink key={item.to} item={item} />
      ))}

      <div className="relative flex items-center justify-center">
        <button
          type="button"
          aria-label="Hinzufügen"
          onClick={() => openAddModal(ROUTE_PRESET[pathname] ?? null)}
          className="-mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent-purple to-blue text-3xl text-white shadow-glow-purple transition active:scale-90 hover:brightness-110"
        >
          +
        </button>
      </div>

      {RIGHT.map((item) => (
        <NavItemLink key={item.to} item={item} />
      ))}
    </nav>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex h-[70px] flex-col items-center justify-center gap-1 text-[0.62rem] font-bold transition',
          isActive ? 'text-accent-neon' : 'text-muted hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('text-xl transition', isActive && 'drop-shadow-[0_0_10px_rgba(0,245,212,0.6)]')} aria-hidden>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
