import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AddAnimeModal } from '@/features/shared/AddAnimeModal';
import { DetailModal } from '@/features/shared/DetailModal';
import { FranchiseModal } from '@/features/franchise/FranchiseModal';

export function AppShell() {
  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-32 md:px-10">
        <Outlet />
      </main>
      <BottomNav />

      {/* Global overlays */}
      <AddAnimeModal />
      <DetailModal />
      <FranchiseModal />
    </div>
  );
}
