import { supabase, setSessionPersistence } from '@/lib/supabase';

export interface Credentials {
  email: string;
  password: string;
}

export async function signIn({ email, password }: Credentials, remember: boolean) {
  setSessionPersistence(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(
  { email, password }: Credentials,
  username: string,
  remember: boolean,
) {
  setSessionPersistence(remember);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateUsername(username: string) {
  const { error } = await supabase.auth.updateUser({ data: { username } });
  if (error) throw error;
}

/** Friendly German messages for the Supabase auth errors we expect. */
export function authErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? '';
  if (/invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort ist falsch.';
  if (/user already registered/i.test(msg)) return 'Diese E-Mail ist bereits registriert.';
  if (/email not confirmed/i.test(msg)) return 'Bitte bestätige zuerst deine E-Mail.';
  if (/password should be at least/i.test(msg))
    return 'Das Passwort ist zu kurz (mind. 6 Zeichen).';
  if (/rate limit|too many/i.test(msg)) return 'Zu viele Versuche. Bitte kurz warten.';
  if (/unable to validate email|invalid email/i.test(msg)) return 'Ungültige E-Mail-Adresse.';
  return msg || 'Unbekannter Fehler. Bitte erneut versuchen.';
}
