import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/redux/hooks';
import { Url } from "@/service/helpers/urlConstants";

interface SocketContextProps {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
    socket: null,
    isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode; }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const { user, accessToken } = useAppSelector(state => state.authData);

    useEffect(() => {
        // 🟢 CORRECCIÓN 1: Validamos que exista un token o un ID real
        if (!accessToken || !user?.id) {
            // Si estábamos conectados, limpiamos todo
            if (socket) {
                socket.disconnect();
                const onSetSocket = () => {
                    setSocket(null);
                    setIsConnected(false);
                };
                onSetSocket();
            }
            return;
        }

        // 2. INICIAR CONEXIÓN
        const socketInstance = io(Url, {
            auth: {
                token: accessToken
            },
            withCredentials: true,
            transports: ['websocket'],
        });

        // 3. LISTENERS BÁSICOS
        socketInstance.on('connect', () => {
            console.log('⚡️ Conectado al Engine de Tiempo Real de Chelinstagram');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ Desconectado del servidor WebSocket');
            setIsConnected(false);
        });

        const onSetSocket = () => {
            setSocket(socketInstance);
        };
        onSetSocket();

        // 4. CLEANUP
        return () => {
            socketInstance.disconnect();
        };

        // 🟢 CORRECCIÓN 3: Dependemos de primitive values (user.id) para evitar reconexiones falsas
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, accessToken]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};