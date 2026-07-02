import { supabase } from '@/lib/supabase';
import { env, isPushConfigured } from '@/lib/env';

/**
 * Web Push client helpers. Fully functional, but inert until a VAPID public key
 * is configured (`VITE_VAPID_PUBLIC_KEY`) and the Edge Function is deployed —
 * see supabase/functions/push-dispatch. The UI degrades gracefully meanwhile.
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export { isPushConfigured };

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) throw new Error('Push wird auf diesem Gerät nicht unterstützt.');
  if (!isPushConfigured) throw new Error('Push-Benachrichtigungen sind noch nicht aktiviert.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast: lib types make Uint8Array generic over ArrayBufferLike; our buffer
    // is a plain ArrayBuffer, which BufferSource expects.
    applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey) as BufferSource,
  });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { subscription: sub.toJSON(), endpoint: sub.endpoint },
      { onConflict: 'user_id,endpoint' },
    );
  if (error) throw error;
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
