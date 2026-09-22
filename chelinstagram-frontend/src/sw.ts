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
            data: { url: data.url || '/' }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Chelinstagram', options)
        );
    }
});

// 4. Tipamos el evento como NotificationEvent
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    // Aseguramos que use self.clients para que TypeScript no se queje
    event.waitUntil(
        self.clients.openWindow(event.notification.data.url)
    );
});