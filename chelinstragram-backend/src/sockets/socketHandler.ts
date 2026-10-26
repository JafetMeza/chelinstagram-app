import { Server, Socket } from 'socket.io';
import { prisma } from "../config/database";
import { sendPushToUser } from '../controllers/notificationController';
import { messageInclude, serializeMessage } from '../helper/chatHelper';
import { addUserSocket, getOnlineUserIds, isUserOnline, removeUserSocket, userRoom } from './presence';
import { registerMessageEvents } from './messageEvents';
import { registerFingerkissEvents } from './fingerkissEvents';
import { markLastSeen, notifyUserCameOnline, startPresenceHeartbeat } from './presenceNotifications';

let ioInstance: Server | null = null; // 🟢 NEW: lets REST controllers (storyController) emit too

// Para que los controllers REST puedan emitir a todos los dispositivos de varios usuarios
export const emitToUsers = (userIds: string[], event: string, payload: unknown) => {
    if (!ioInstance || userIds.length === 0) return;
    ioInstance.to(userIds.map(userRoom)).emit(event, payload);
};

export const handleSockets = (io: Server) => {
    ioInstance = io; // 🟢 NEW
    startPresenceHeartbeat();

    io.on('connection', (socket: Socket) => {
        const user = socket.data.user;
        const currentUserId: string | undefined = user.id || user.userId || user.sub;

        if (!currentUserId) {
            socket.disconnect(true);
            return;
        }

        console.log(`🟢 [Socket] ${user.username} conectado con ID: ${currentUserId}`);

        socket.join(userRoom(currentUserId));
        if (addUserSocket(currentUserId, socket.id)) {
            notifyUserCameOnline(currentUserId).catch(err => console.error('Online notification error:', err));
        }

        io.emit('user_status_change', { userId: currentUserId, status: 'online' });
        socket.emit('initial_presence', getOnlineUserIds());

        registerMessageEvents(io, socket, currentUserId);
        registerFingerkissEvents(io, socket, currentUserId);

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
                    select: { participants: { select: { userId: true, user: { select: { readReceiptsEnabled: true } } } } }
                });

                if (!conversation) {
                    socket.emit('message_error', { tempId, error: 'No perteneces a esta conversación' });
                    return;
                }

                const [createdMessage] = await prisma.$transaction([
                    prisma.message.create({
                        data: {
                            content,
                            conversationId,
                            senderId: currentUserId,
                            isRead: false
                        },
                        include: messageInclude
                    }),
                    // Mantiene el orden de la bandeja (ordenada por updatedAt)
                    prisma.conversation.update({
                        where: { id: conversationId },
                        data: { updatedAt: new Date() }
                    })
                ]);

                const readReceipts = conversation.participants.every(p => p.user.readReceiptsEnabled);
                const savedMessage = serializeMessage(createdMessage, readReceipts);

                const receiverIds = conversation.participants
                    .map(p => p.userId)
                    .filter(id => id !== currentUserId);

                for (const receiverId of receiverIds) {
                    if (isUserOnline(receiverId)) {
                        io.to(userRoom(receiverId)).emit('receive_message', savedMessage);
                    } else {
                        await sendPushToUser(receiverId, {
                            title: `Nuevo mensaje de ${createdMessage.sender.username}`,
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
            // Solo está offline cuando se cierra su último dispositivo
            if (removeUserSocket(currentUserId, socket.id)) {
                io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
                markLastSeen([currentUserId]).catch(err => console.error('lastSeenAt error:', err));
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
