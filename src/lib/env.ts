/**
 * Central, typed access to build-time environment variables.
 * Fails fast in development if a required value is missing.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    const msg = `[env] Missing required environment variable: ${name}`;
    if (import.meta.env.DEV) throw new Error(msg);
    console.error(msg);
    return '';
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  /** Public VAPID key. Empty until Web Push is activated — the UI degrades gracefully. */
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '',
} as const;

export const isPushConfigured = env.vapidPublicKey.length > 0;
