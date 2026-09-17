import { Server, Socket } from 'socket.io';
import { prisma } from "../config/database";

// Mapa en memoria para saber quién está online: { userId: socketId }
const onlineUsers = new Map<string, string>();

export const handleSockets = (io: Server) => {
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
                const { receiverId, conversationId, content } = data;

                const savedMessage = await prisma.message.create({
                    data: {
                        content,
                        conversationId,
                        senderId: currentUserId, // ✅ fixed
                    },
                    include: {
                        sender: { select: { id: true, username: true, avatarUrl: true } }
                    }
                });

                const receiverSocketId = onlineUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', savedMessage);
                }

                socket.emit('message_sent', savedMessage);
            } catch (error) {
                console.error("Error al guardar mensaje de socket:", error);
                socket.emit('message_error', { error: 'No se pudo guardar el mensaje' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`🔴 [Socket] ${user.username} se ha desconectado.`);
            onlineUsers.delete(currentUserId); // ✅ fixed
            io.emit('user_status_change', { userId: currentUserId, status: 'offline' }); // ✅ fixed
        });

        socket.on('typing', ({ conversationId, receiverId }: { conversationId: string; receiverId: string; }) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', { conversationId, userId: currentUserId });
            }
        });

        socket.on('stop_typing', ({ conversationId, receiverId }: { conversationId: string; receiverId: string; }) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_stop_typing', { conversationId, userId: currentUserId });
            }
        });
    });
};