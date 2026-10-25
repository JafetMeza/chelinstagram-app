import { Server, Socket } from 'socket.io';
import { prisma } from "../config/database";
import { sendPushToUser } from '../controllers/notificationController';

// userId -> socket ids abiertos (un usuario puede tener varias pestañas/dispositivos)
const onlineUsers = new Map<string, Set<string>>();
let ioInstance: Server | null = null; // 🟢 NEW: lets REST controllers (storyController) emit too

// Cada socket se une a la room de su usuario para poder emitir a todos sus dispositivos
const userRoom = (userId: string) => `user:${userId}`;
const isUserOnline = (userId: string) => (onlineUsers.get(userId)?.size ?? 0) > 0;

export const handleSockets = (io: Server) => {
    ioInstance = io; // 🟢 NEW

    io.on('connection', (socket: Socket) => {
        const user = socket.data.user;
        const currentUserId: string | undefined = user.id || user.userId || user.sub;

        if (!currentUserId) {
            socket.disconnect(true);
            return;
        }

        console.log(`🟢 [Socket] ${user.username} conectado con ID: ${currentUserId}`);

        socket.join(userRoom(currentUserId));
        const userSockets = onlineUsers.get(currentUserId) ?? new Set<string>();
        userSockets.add(socket.id);
        onlineUsers.set(currentUserId, userSockets);

        io.emit('user_status_change', { userId: currentUserId, status: 'online' });
        socket.emit('initial_presence', Array.from(onlineUsers.keys()));

        socket.on('send_message', async (data) => {
            const { conversationId, content, tempId } = data ?? {};

            try {
                if (typeof conversationId !== 'string' || typeof content !== 'string' || !content.trim()) {
                    socket.emit('message_error', { tempId, error: 'Mensaje inválido' });
                    return;
                }

                // Solo los participantes pueden escribir; los destinatarios salen de la conversación, no del cliente
                const conversation = await prisma.conversation.findFirst({
                    where: { id: conversationId, participants: { some: { userId: currentUserId } } },
                    select: { participants: { select: { userId: true } } }
                });

                if (!conversation) {
                    socket.emit('message_error', { tempId, error: 'No perteneces a esta conversación' });
                    return;
                }

                const [savedMessage] = await prisma.$transaction([
                    prisma.message.create({
                        data: {
                            content,
                            conversationId,
                            senderId: currentUserId,
                            isRead: false
                        },
                        include: {
                            sender: { select: { id: true, username: true, avatarUrl: true } }
                        }
                    }),
                    // Mantiene el orden de la bandeja (ordenada por updatedAt)
                    prisma.conversation.update({
                        where: { id: conversationId },
                        data: { updatedAt: new Date() }
                    })
                ]);

                const receiverIds = conversation.participants
                    .map(p => p.userId)
                    .filter(id => id !== currentUserId);

                for (const receiverId of receiverIds) {
                    if (isUserOnline(receiverId)) {
                        io.to(userRoom(receiverId)).emit('receive_message', savedMessage);
                    } else {
                        await sendPushToUser(receiverId, {
                            title: `Nuevo mensaje de ${savedMessage.sender.username}`,
                            body: content,
                            url: `/chat/${conversationId}`
                        });
                    }
                }

                // Sincroniza las otras pestañas/dispositivos del remitente
                socket.to(userRoom(currentUserId)).emit('receive_message', savedMessage);
                socket.emit('message_sent', { ...savedMessage, tempId });
            } catch (error) {
                console.error("Error al guardar mensaje de socket:", error);
                socket.emit('message_error', { tempId, error: 'No se pudo guardar el mensaje' });
            }
        });

        socket.on('typing', (data: { conversationId: string, receiverId: string; }) => {
            if (!data?.receiverId) return;
            io.to(userRoom(data.receiverId)).emit('user_typing', {
                conversationId: data.conversationId,
                userId: currentUserId // El ID de quien está escribiendo
            });
        });

        // 🟢 NUEVO: Escuchar cuando alguien deja de escribir
        socket.on('stop_typing', (data: { conversationId: string, receiverId: string; }) => {
            if (!data?.receiverId) return;
            io.to(userRoom(data.receiverId)).emit('user_stop_typing', {
                conversationId: data.conversationId,
                userId: currentUserId
            });
        });

        socket.on('disconnect', () => {
            console.log(`🔴 [Socket] ${user.username} se ha desconectado.`);
            const sockets = onlineUsers.get(currentUserId);
            sockets?.delete(socket.id);

            // Solo está offline cuando se cierra su último dispositivo
            if (!sockets || sockets.size === 0) {
                onlineUsers.delete(currentUserId);
                io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
            }
        });
    });
};

/**
 * 🟢 NEW: Called from storyController right after a story is created.
 * Mirrors the exact same online/offline fallback pattern as `send_message`:
 * live socket event if the follower is connected, web push if they're not.
 */
export const notifyNewStory = async (followerIds: string[], story: any) => {
    if (!ioInstance) return;

    for (const followerId of followerIds) {
        if (isUserOnline(followerId)) {
            ioInstance.to(userRoom(followerId)).emit('new_story', story);
        } else {
            await sendPushToUser(followerId, {
                title: `${story.author.username} added a new story`,
                body: 'Tap to view',
                // The story tray lives on the home feed; there is no /stories route
                url: '/'
            });
        }
    }
};
