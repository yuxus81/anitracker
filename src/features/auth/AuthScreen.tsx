import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/store/ui';
import { authErrorMessage, sendPasswordReset, signIn, signUp } from './authApi';

type Mode = 'login' | 'register' | 'forgot';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn({ email, password }, remember);
      } else if (mode === 'register') {
        if (username.trim().length < 2) throw new Error('Bitte gib einen Benutzernamen ein.');
        const { session } = await signUp({ email, password }, username.trim(), remember);
        if (!session) {
          toast.info('Fast fertig! Bitte bestätige deine E-Mail.');
          setMode('login');
        }
      } else {
        await sendPasswordReset(email);
        toast.success('Reset-Link gesendet. Schau in dein Postfach.');
        setMode('login');
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'login' ? 'Willkommen zurück' : mode === 'register' ? 'Account erstellen' : 'Passwort zurücksetzen';

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm rounded-xl3 border border-accent-purple/25 bg-card p-8 shadow-modal">
        <div className="mb-7 text-center">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt="AniTracker"
            width={64}
            height={64}
            className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-glow-purple"
          />
          <h1 className="text-2xl font-extrabold text-gradient">YP AniTracker</h1>
          <p className="mt-1 text-sm text-muted">{title}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <Field
              label="Benutzername"
              value={username}
              onChange={setUsername}
              type="text"
              autoComplete="username"
              placeholder="Dein Name"
            />
          )}
          <Field
            label="E-Mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            placeholder="du@example.com"
            required
          />
          {mode !== 'forgot' && (
            <Field
              label="Passwort"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              required
            />
          )}

          {mode === 'login' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-accent-purple"
              />
              Angemeldet bleiben
            </label>
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-orange">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={busy}>
            {mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Registrieren' : 'Link senden'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted">
          {mode === 'login' && (
            <>
              <button className="link" onClick={() => switchTo('forgot')}>
                Passwort vergessen?
              </button>
              <span>
                Noch kein Konto?{' '}
                <button className="link" onClick={() => switchTo('register')}>
                  Registrieren
                </button>
              </span>
            </>
          )}
          {mode !== 'login' && (
            <button className="link" onClick={() => switchTo('login')}>
              ← Zurück zum Login
            </button>
          )}
        </div>
      </div>
    </div>
  );

  function switchTo(next: Mode) {
    setError('');
    setMode(next);
  }
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({ label, value, onChange, type, autoComplete, placeholder, required }: FieldProps) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-xs font-semibold text-muted">{label}</span>
      <input
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none transition focus:border-accent-purple"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
