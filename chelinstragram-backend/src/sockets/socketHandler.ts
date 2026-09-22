import { Server, Socket } from 'socket.io';
import { prisma } from "../config/database";
import { sendPushToUser } from '../controllers/notificationController';

const onlineUsers = new Map<string, string>();
let ioInstance: Server | null = null; // 🟢 NEW: lets REST controllers (storyController) emit too

export const handleSockets = (io: Server) => {
    ioInstance = io; // 🟢 NEW

    io.on('connection', (socket: Socket) => {
        const user = socket.data.user;
        const currentUserId = user.id || user.userId || user.sub;

        console.log(`🟢 [Socket] ${user.username} conectado con ID: ${currentUserId}`);

        if (currentUserId) {
            onlineUsers.set(currentUserId, socket.id);
        }

        io.emit('user_status_change', { userId: currentUserId, status: 'online' });
        socket.emit('initial_presence', Array.from(onlineUsers.keys()));

        socket.on('send_message', async (data) => {
            try {
                const { receiverId, conversationId, content, tempId } = data;

                const savedMessage = await prisma.message.create({
                    data: {
                        content,
                        conversationId,
                        senderId: currentUserId,
                        isRead: false
                    },
                    include: {
                        sender: { select: { id: true, username: true, avatarUrl: true } }
                    }
                });

                const receiverSocketId = onlineUsers.get(receiverId);

                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', savedMessage);
                } else {
                    await sendPushToUser(receiverId, {
                        title: `Nuevo mensaje de ${savedMessage.sender.username}`,
                        body: content,
                        url: `/chat/${conversationId}`
                    });
                }

                socket.emit('message_sent', { ...savedMessage, tempId });
            } catch (error) {
                console.error("Error al guardar mensaje de socket:", error);
                socket.emit('message_error', { tempId: data.tempId, error: 'No se pudo guardar el mensaje' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔴 [Socket] ${user.username} se ha desconectado.`);
            onlineUsers.delete(currentUserId);
            io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
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
        const socketId = onlineUsers.get(followerId);

        if (socketId) {
            ioInstance.to(socketId).emit('new_story', story);
        } else {
            await sendPushToUser(followerId, {
                title: `${story.author.username} added a new story`,
                body: 'Tap to view',
                url: `/stories/${story.author.username}`
            });
        }
    }
};