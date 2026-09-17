import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/redux/hooks';
import { Url } from "@/service/helpers/urlConstants";

interface SocketContextProps {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: string[];
}

const SocketContext = createContext<SocketContextProps>({
    socket: null,
    isConnected: false,
    onlineUsers: []
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode; }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    const { user, accessToken } = useAppSelector(state => state.authData);

    useEffect(() => {
        // 1. Si no hay token, destruimos cualquier socket fantasma y no hacemos nada
        if (!accessToken || !user?.id) {
            if (socket) {
                socket.disconnect();
                const onDisconnect = () => {
                    setSocket(null);
                    setIsConnected(false);
                    setOnlineUsers([]);
                };
                onDisconnect();
            }
            return;
        }

        const baseUrl = Url.replace('/api', '');

        // 2. Conectarse, PERO pasándole el accessToken como query auth
        const socketInstance = io(baseUrl, {
            auth: {
                token: accessToken // Si esto está expirado, el backend lo escupirá
            },
            withCredentials: true,
        });

        socketInstance.on('connect', () => {
            console.log('⚡️ Conectado al Engine de Tiempo Real');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log(`❌ Desconectado: ${reason}`);
            setIsConnected(false);
        });

        socketInstance.on('initial_presence', (userIds: string[]) => {
            setOnlineUsers([...userIds]);
        });

        // 3. LA CLAVE: Manejar el error de expiración
        socketInstance.on('connect_error', (err) => {
            console.error('🚫 Error Socket:', err.message);
            setIsConnected(false);

            // Si el backend te rechazó por token expirado, cerramos la instancia para evitar spam.
            // Cuando Redux haga el 'refresh' y actualice el 'accessToken', 
            // este useEffect se volverá a correr solo con el token nuevo.
            if (err.message.includes("Acceso denegado")) {
                socketInstance.disconnect();
            }
        });

        socketInstance.on('user_status_change', ({ userId, status }: { userId: string; status: 'online' | 'offline'; }) => {
            setOnlineUsers(prev => {
                if (status === 'online') {
                    return prev.includes(userId) ? prev : [...prev, userId];
                }
                return prev.filter(id => id !== userId);
            });
        });

        const saveInstance = () => {
            setSocket(socketInstance);
        };
        saveInstance();

        return () => {
            socketInstance.disconnect();
            setSocket(null);
            setIsConnected(false);
            setOnlineUsers([]);
        };

        // 🟢 Al poner accessToken aquí, garantizamos que cuando Redux lo refresque,
        // el Socket se destruya y se vuelva a crear automáticamente con el nuevo token válido.
    }, [user?.id, accessToken]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};