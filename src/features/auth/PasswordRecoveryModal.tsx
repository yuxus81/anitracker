import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/store/ui';
import { authErrorMessage, updatePassword } from './authApi';
import { useAuth } from './AuthProvider';

export function PasswordRecoveryModal() {
  const { recovery, clearRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Mindestens 6 Zeichen.');
    if (password !== confirm) return setError('Die Passwörter stimmen nicht überein.');
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success('Passwort aktualisiert.');
      clearRecovery();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={recovery} onClose={clearRecovery} title="Neues Passwort setzen" size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-accent-purple"
          type="password"
          placeholder="Neues Passwort"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-accent-purple"
          type="password"
          placeholder="Passwort bestätigen"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm font-semibold text-orange">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" fullWidth loading={busy}>
          Speichern
        </Button>
      </form>
    </Modal>
  );
}
