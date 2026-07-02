/// <reference lib="webworker" />
/*
 * Custom service worker (vite-plugin-pwa `injectManifest`).
 * Precaches the app shell and handles Web Push + notification clicks.
 * NOTE: excluded from the app tsconfig — vite-plugin-pwa compiles it on its own.
 */
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
// The manifest is injected here at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Web Push (active once the Edge Function + VAPID keys are configured) ----

self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; url?: string; icon?: string } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title ?? 'YP AniTracker';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? 'Es gibt Neuigkeiten zu deinen Animes.',
      icon: payload.icon ?? 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: payload.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data?.url as string | undefined) ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

export {};
