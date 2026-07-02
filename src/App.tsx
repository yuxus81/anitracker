import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { PasswordRecoveryModal } from '@/features/auth/PasswordRecoveryModal';
import { SplashLoader } from '@/components/layout/SplashLoader';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { WatchedPage } from '@/features/watched/WatchedPage';
import { DiscoverPage } from '@/features/discover/DiscoverPage';
import { WatchlistPage } from '@/features/watchlist/WatchlistPage';
import { ContinuationPage } from '@/features/continuation/ContinuationPage';
import { CurrentPage } from '@/features/current/CurrentPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { useDailySync } from '@/features/sync/useDailySync';

export function App() {
  const { session, loading } = useAuth();

  // Kick off the once-a-day background sync while the user is logged in.
  useDailySync(!!session);

  return (
    <>
      {loading ? (
        <SplashLoader />
      ) : session ? (
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/watched" element={<WatchedPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/continuation" element={<ContinuationPage />} />
            <Route path="/current" element={<CurrentPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <AuthScreen />
      )}

      {/* Password recovery can fire before or after the app is shown. */}
      <PasswordRecoveryModal />
    </>
  );
}
