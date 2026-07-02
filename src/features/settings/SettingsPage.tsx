import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  signOut,
  updatePassword,
  updateUsername,
  authErrorMessage,
} from '@/features/auth/authApi';
import { wipeOwnAnimes } from '@/api/animes';
import {
  getPushSubscription,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/features/push/pushClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/ui';

export function SettingsPage() {
  const { user, username } = useAuth();
  const qc = useQueryClient();

  return (
    <div className="mx-auto max-w-lg animate-stagger">
      <PageHeader title="Einstellungen" />

      <ProfileCard initialUsername={username} />
      <PasswordCard />
      <NotificationsCard />
      <AccountCard userId={user?.id ?? null} email={user?.email ?? ''} qc={qc} />

      <p className="mt-8 text-center text-xs text-muted">YP AniTracker · v2.0</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-surface mb-4 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function ProfileCard({ initialUsername }: { initialUsername: string }) {
  const [name, setName] = useState(initialUsername);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== initialUsername && name.trim().length > 0;

  async function save() {
    setSaving(true);
    try {
      await updateUsername(name.trim());
      toast.success('Benutzername aktualisiert');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Profil">
      <label className="mb-2 block text-xs font-semibold text-muted">Benutzername</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent-purple"
      />
      <Button variant="primary" className="mt-3" disabled={!dirty} loading={saving} onClick={save}>
        Speichern
      </Button>
    </Card>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (pw.length < 6) return toast.error('Mindestens 6 Zeichen.');
    if (pw !== confirm) return toast.error('Passwörter stimmen nicht überein.');
    setSaving(true);
    try {
      await updatePassword(pw);
      setPw('');
      setConfirm('');
      toast.success('Passwort geändert');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Sicherheit">
      <div className="space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Neues Passwort"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent-purple"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Passwort bestätigen"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-accent-purple"
        />
      </div>
      <Button
        variant="primary"
        className="mt-3"
        disabled={!pw && !confirm}
        loading={saving}
        onClick={save}
      >
        Passwort ändern
      </Button>
    </Card>
  );
}

function NotificationsCard() {
  const supported = isPushSupported();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushSubscription()
      .then((s) => setOn(!!s))
      .catch(() => setOn(false));
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      if (on) {
        await unsubscribeFromPush();
        setOn(false);
        toast.info('Benachrichtigungen deaktiviert');
      } else {
        await subscribeToPush();
        setOn(true);
        toast.success('Benachrichtigungen aktiviert');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const disabled = !supported || !isPushConfigured || busy;

  return (
    <Card title="Benachrichtigungen">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">Push bei neuen Releases</p>
          <p className="text-xs text-muted">
            {!supported
              ? 'Auf diesem Gerät nicht verfügbar.'
              : !isPushConfigured
                ? 'Bald verfügbar — wird serverseitig aktiviert.'
                : 'Erhalte eine Nachricht, sobald eine Fortsetzung erscheint.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Push-Benachrichtigungen umschalten"
          disabled={disabled}
          onClick={toggle}
          className={`relative h-7 w-12 flex-shrink-0 rounded-full transition disabled:opacity-40 ${
            on ? 'bg-accent-neon' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              on ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>
    </Card>
  );
}

function AccountCard({
  userId,
  email,
  qc,
}: {
  userId: string | null;
  email: string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);

  async function wipe() {
    if (!userId) return;
    setBusy(true);
    try {
      await wipeOwnAnimes(userId);
      await qc.invalidateQueries({ queryKey: qk.animes });
      toast.success('Alle Anime-Daten gelöscht');
      setConfirmOpen(false);
      setPhrase('');
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Konto">
      <p className="mb-4 truncate text-sm text-muted">Angemeldet als {email}</p>
      <div className="flex flex-col gap-2">
        <Button variant="ghost" fullWidth onClick={() => signOut()}>
          Abmelden
        </Button>
        <Button variant="danger" fullWidth onClick={() => setConfirmOpen(true)}>
          Alle Daten löschen
        </Button>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Wirklich löschen?" size="sm">
        <p className="text-sm text-muted">
          Das entfernt <strong className="text-ink">deine gesamte Anime-Sammlung</strong> unwiderruflich.
          Dein Konto bleibt bestehen. Tippe zur Bestätigung <strong className="text-danger">LÖSCHEN</strong>.
        </p>
        <input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="LÖSCHEN"
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-danger"
        />
        <Button
          variant="danger"
          fullWidth
          className="mt-4"
          disabled={phrase.trim().toUpperCase() !== 'LÖSCHEN'}
          loading={busy}
          onClick={wipe}
        >
          Endgültig löschen
        </Button>
      </Modal>
    </Card>
  );
}
