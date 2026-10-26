/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

// 1. Le decimos a TypeScript que 'self' es un Service Worker, no una Ventana
declare let self: ServiceWorkerGlobalScope;

// 2. Usamos 'as any' porque __WB_MANIFEST es inyectado mágicamente por Vite al hacer build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
precacheAndRoute((self as any).__WB_MANIFEST || []);

// 3. Tipamos el evento como PushEvent
self.addEventListener('push', (event: PushEvent) => {
    if (event.data) {
        const data = event.data.json();

        const options = {
            body: data.body || 'Tienes un nuevo mensaje',
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-16x16.png',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' },
            // Mismo tag = reemplaza la anterior (p. ej. varias invitaciones seguidas)
            ...(data.tag ? { tag: data.tag, renotify: true } : {})
        };

        event.waitUntil((async () => {
            // skipIfVisible: si la app está abierta y a la vista, el aviso ya aparece dentro de ella
            if (data.skipIfVisible) {
                const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                if (windowClients.some(c => c.visibilityState === 'visible')) return;
            }
            await self.registration.showNotification(data.title || 'Chelinstagram', options);
        })());
    }
});

// 4. Tipamos el evento como NotificationEvent
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

    // Si la PWA ya está abierta la enfocamos y navegamos; si no, abrimos una ventana nueva
    event.waitUntil((async () => {
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const client = windowClients.find(c => new URL(c.url).origin === self.location.origin);

        if (client) {
            await client.focus();
            if (client.url !== targetUrl) await client.navigate(targetUrl);
            return;
        }

        await self.clients.openWindow(targetUrl);
    })());
});