// userId -> socket ids abiertos (un usuario puede tener varias pestañas/dispositivos)
const onlineUsers = new Map<string, Set<string>>();

// Cada socket se une a la room de su usuario para poder emitir a todos sus dispositivos
export const userRoom = (userId: string) => `user:${userId}`;

export const isUserOnline = (userId: string) => (onlineUsers.get(userId)?.size ?? 0) > 0;

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

// Devuelve true si es el primer socket del usuario (acaba de conectarse)
export const addUserSocket = (userId: string, socketId: string) => {
    const sockets = onlineUsers.get(userId) ?? new Set<string>();
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);
    onlineUsers.set(userId, sockets);
    return wasOffline;
};

// Devuelve true si era el último socket del usuario (ahora está offline)
export const removeUserSocket = (userId: string, socketId: string) => {
    const sockets = onlineUsers.get(userId);
    sockets?.delete(socketId);
    if (!sockets || sockets.size === 0) {
        onlineUsers.delete(userId);
        return true;
    }
    return false;
};
