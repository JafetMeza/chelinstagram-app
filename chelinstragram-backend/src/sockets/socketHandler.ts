import { Server, Socket } from 'socket.io';
import { prisma } from "../config/database";
import { sendPushToUser } from '../controllers/notificationController'; // 👈 Importamos la utilidad

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
                const { receiverId, conversationId, content, tempId } = data;

                const savedMessage = await prisma.message.create({
                    data: {
                        content,
                        conversationId,
                        senderId: currentUserId,
                        isRead: false // 👈 Guardamos el mensaje como no leído por defecto
                    },
                    include: {
                        sender: { select: { id: true, username: true, avatarUrl: true } }
                    }
                });

                const receiverSocketId = onlineUsers.get(receiverId);

                if (receiverSocketId) {
                    // Si está conectado, mandamos por WebSocket
                    io.to(receiverSocketId).emit('receive_message', savedMessage);
                } else {
                    // 🟢 SI NO ESTÁ CONECTADO, MANDAMOS NOTIFICACIÓN PUSH
                    await sendPushToUser(receiverId, {
                        title: `Nuevo mensaje de ${savedMessage.sender.username}`,
                        body: content,
                        url: `/chat/${conversationId}`
                    });
                }

                // Asegúrate de devolver el tempId (si lo enviaste desde el front) para confirmar el envío
                socket.emit('message_sent', { ...savedMessage, tempId });
            } catch (error) {
                console.error("Error al guardar mensaje de socket:", error);
                socket.emit('message_error', { tempId: data.tempId, error: 'No se pudo guardar el mensaje' });
            }
        });

        // ... (resto de tus listeners disconnect, typing, stop_typing quedan igual)
        socket.on('disconnect', () => {
            console.log(`🔴 [Socket] ${user.username} se ha desconectado.`);
            onlineUsers.delete(currentUserId);
            io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
        });

        // ... (código de typing omitido para brevedad)
    });
};