import { useState, useEffect } from 'react';
import { useAppSelector } from "@/redux/hooks";
import { API_ROUTES } from "@/service/helpers/urlConstants";

export function PushNotificationPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const { accessToken, user } = useAppSelector(state => state.authData);

    useEffect(() => {
        // Solo mostramos el banner si el usuario está logueado, el navegador lo soporta
        // y el permiso está en 'default' (es decir, ni aceptado ni bloqueado aún).
        if (user?.id && 'Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'default') {
                const onSetPrompt = () => setShowPrompt(true);
                onSetPrompt(); // Mostramos el prompt inmediatamente al montar el componente
            }
        }
    }, [user?.id]);

    const enableNotifications = async () => {
        try {
            // 1. Pedimos permiso al OS (gatillado por el clic del botón)
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;

                // 2. Nos suscribimos usando la Public Key
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
                });

                // 3. Mandamos la suscripción al backend usando fetch nativo
                const response = await fetch(API_ROUTES.NOTIFICATIONS.SUBSCRIBE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}` // CRÍTICO: Para saber de quién es el teléfono
                    },
                    body: JSON.stringify(subscription)
                });

                if (response.ok) {
                    console.log('¡Suscripción exitosa!');
                    setShowPrompt(false);
                } else {
                    console.error('Error del backend al guardar suscripción');
                }
            } else {
                // El usuario denegó el permiso
                setShowPrompt(false);
            }
        } catch (error) {
            console.error('Error al suscribir:', error);
            setShowPrompt(false);
        }
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-top-5">
            <div className="flex flex-col">
                <span className="font-bold text-sm">Activa las notificaciones</span>
                <span className="text-xs text-white/80">Recibe alertas de mensajes nuevos</span>
            </div>
            <div className="flex gap-2 shrink-0">
                <button
                    onClick={enableNotifications}
                    className="bg-white text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs active:scale-95 transition-transform"
                >
                    Activar
                </button>
                <button
                    onClick={() => setShowPrompt(false)}
                    className="bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}