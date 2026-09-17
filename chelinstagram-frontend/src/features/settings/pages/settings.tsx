import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from "@/redux/hooks";
import { Url } from "@/service/helpers/urlConstants";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faBell, faTriangleExclamation, faRotateRight } from '@fortawesome/free-solid-svg-icons';

// Función utilitaria para la llave VAPID
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const Settings = () => {
    const navigate = useNavigate();
    const { accessToken } = useAppSelector(state => state.authData);

    const [isPushEnabled, setIsPushEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Usamos useCallback para poder llamar a esta función tanto en el useEffect 
    // como en el botón de re-intentar, sin que React se queje.
    const checkSubscriptionStatus = useCallback(async () => {
        setIsLoading(true);

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setIsLoading(false);
            return;
        }

        // Revisamos el estado actual del permiso en el navegador
        const currentPermission = Notification.permission;

        if (currentPermission === 'denied') {
            setPermissionDenied(true);
            setIsPushEnabled(false);
            setIsLoading(false);
            return;
        } else {
            setPermissionDenied(false);
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsPushEnabled(!!subscription);
        } catch (error) {
            console.error("Error leyendo suscripción:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // El useEffect ahora está limpio y no causa renderizados en cascada
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        checkSubscriptionStatus();
    }, [checkSubscriptionStatus]);

    const toggleNotifications = async () => {
        try {
            setIsLoading(true);
            const registration = await navigator.serviceWorker.ready;
            const baseUrl = Url.replace('/api', '');

            if (isPushEnabled) {
                // 🔴 APAGAR NOTIFICACIONES
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                    await fetch(`${baseUrl}/api/notifications/unsubscribe`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({ endpoint: subscription.endpoint })
                    });
                }
                setIsPushEnabled(false);
            } else {
                // 🟢 ENCENDER NOTIFICACIONES (Pedir permiso desde cero)
                const permission = await Notification.requestPermission(); // 👈 El navegador mostrará su ventanita nativa aquí

                if (permission === 'granted') {
                    // Si aceptó, generamos la llave y nos suscribimos
                    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                    });

                    // Lo mandamos al backend
                    await fetch(`${baseUrl}/api/notifications/subscribe`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify(subscription)
                    });

                    setIsPushEnabled(true);
                    setPermissionDenied(false);
                } else if (permission === 'denied') {
                    // Si el usuario le dio a "Bloquear" en la ventanita
                    setPermissionDenied(true);
                }
            }
        } catch (error) {
            console.error("Error cambiando estado de notificaciones:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-black text-black dark:text-white">
            <div className="flex items-center p-4 border-b dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-50">
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg mr-4">Configuración</h1>
            </div>

            <div className="p-4 space-y-6">
                <section>
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 ml-2">Dispositivo</h2>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border dark:border-zinc-800">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                                    <FontAwesomeIcon icon={faBell} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">Notificaciones Push</span>
                                    <span className="text-xs text-zinc-500">Alertas de mensajes nuevos</span>
                                </div>
                            </div>

                            <button
                                onClick={toggleNotifications}
                                disabled={isLoading || permissionDenied}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out ${isPushEnabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
                                    } ${(isLoading || permissionDenied) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${isPushEnabled ? 'transform translate-x-6' : ''
                                    }`} />
                            </button>
                        </div>

                        {permissionDenied && (
                            <div className="px-4 pb-4">
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex flex-col gap-3 text-xs">
                                    <div className="flex items-start gap-3">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 text-red-500" />
                                        <p>
                                            Has bloqueado las notificaciones en este navegador. Para activarlas, haz clic en el ícono de configuración (el candadito) en la barra de direcciones de tu navegador y permite las notificaciones.
                                        </p>
                                    </div>

                                    {/* Botón para re-evaluar los permisos después de que el usuario lo cambie en el navegador */}
                                    <button
                                        onClick={checkSubscriptionStatus}
                                        className="self-end flex items-center gap-2 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faRotateRight} />
                                        <span>Ya las permití, reintentar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;