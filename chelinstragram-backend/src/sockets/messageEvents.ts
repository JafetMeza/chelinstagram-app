import { Server, Socket } from 'socket.io';
import { prisma } from '../config/database';
import { isReactionType } from '../config/chat';
import { markConversationRead, messageInclude, serializeMessage } from '../helper/chatHelper';
import { userRoom } from './presence';

type ActionError = { messageId?: string; error: string; };

/**
 * Editar, borrar y reaccionar a mensajes, y marcar como leído.
 * Cada cambio se emite como `message_updated` (mensaje completo serializado) a todos
 * los dispositivos de todos los participantes; el cliente reemplaza el mensaje por id.
 */
export const registerMessageEvents = (io: Server, socket: Socket, currentUserId: string) => {
    const emitError = (payload: ActionError) => socket.emit('message_action_error', payload);

    // Carga el mensaje solo si el usuario participa en su conversación
    const loadMessage = async (messageId: unknown) => {
        if (typeof messageId !== 'string' || !messageId) return null;
        return prisma.message.findFirst({
            where: {
                id: messageId,
                conversation: { participants: { some: { userId: currentUserId } } }
            },
            select: {
                id: true,
                senderId: true,
                deletedAt: true,
                conversationId: true,
                conversation: {
                    select: {
                        participants: { select: { userId: true, user: { select: { readReceiptsEnabled: true } } } }
                    }
                }
            }
        });
    };

    type LoadedMessage = NonNullable<Awaited<ReturnType<typeof loadMessage>>>;

    const broadcastUpdate = async (loaded: LoadedMessage) => {
        const participants = loaded.conversation.participants;
        const readReceipts = participants.every(p => p.user.readReceiptsEnabled);
        const message = await prisma.message.findUniqueOrThrow({
            where: { id: loaded.id },
            include: messageInclude
        });
        io.to(participants.map(p => userRoom(p.userId)))
            .emit('message_updated', serializeMessage(message, readReceipts));
    };

    socket.on('edit_message', async (data) => {
        const { messageId, content } = data ?? {};
        try {
            if (typeof content !== 'string' || !content.trim()) {
                return emitError({ messageId, error: 'El mensaje no puede estar vacío' });
            }

            const loaded = await loadMessage(messageId);
            if (!loaded || loaded.senderId !== currentUserId || loaded.deletedAt) {
                return emitError({ messageId, error: 'No puedes editar este mensaje' });
            }

            await prisma.message.update({
                where: { id: loaded.id },
                data: { content, editedAt: new Date() }
            });
            await broadcastUpdate(loaded);
        } catch (error) {
            console.error('Error al editar mensaje:', error);
            emitError({ messageId, error: 'No se pudo editar el mensaje' });
        }
    });

    socket.on('delete_message', async (data) => {
        const { messageId } = data ?? {};
        try {
            const loaded = await loadMessage(messageId);
            if (!loaded || loaded.senderId !== currentUserId) {
                return emitError({ messageId, error: 'No puedes eliminar este mensaje' });
            }
            if (loaded.deletedAt) return;

            await prisma.$transaction([
                prisma.messageReaction.deleteMany({ where: { messageId: loaded.id } }),
                prisma.message.update({
                    where: { id: loaded.id },
                    data: { deletedAt: new Date() }
                })
            ]);
            await broadcastUpdate(loaded);
        } catch (error) {
            console.error('Error al eliminar mensaje:', error);
            emitError({ messageId, error: 'No se pudo eliminar el mensaje' });
        }
    });

    // Misma reacción = quitarla; otra reacción = reemplazarla
    socket.on('react_message', async (data) => {
        const { messageId, type } = data ?? {};
        try {
            if (!isReactionType(type)) {
                return emitError({ messageId, error: 'Reacción no válida' });
            }

            const loaded = await loadMessage(messageId);
            if (!loaded || loaded.deletedAt) {
                return emitError({ messageId, error: 'No puedes reaccionar a este mensaje' });
            }

            const where = { messageId_userId: { messageId: loaded.id, userId: currentUserId } };
            const existing = await prisma.messageReaction.findUnique({ where });

            if (existing?.type === type) {
                await prisma.messageReaction.delete({ where });
            } else {
                await prisma.messageReaction.upsert({
                    where,
                    update: { type },
                    create: { messageId: loaded.id, userId: currentUserId, type }
                });
            }
            await broadcastUpdate(loaded);
        } catch (error) {
            console.error('Error al reaccionar:', error);
            emitError({ messageId, error: 'No se pudo guardar la reacción' });
        }
    });

    // El cliente lo emite cuando tiene el chat abierto y visible
    socket.on('mark_read', async (data) => {
        const { conversationId } = data ?? {};
        try {
            if (typeof conversationId !== 'string') return;

            const participants = await prisma.participant.findMany({
                where: { conversationId },
                select: { userId: true, user: { select: { readReceiptsEnabled: true } } }
            });
            if (!participants.some(p => p.userId === currentUserId)) return;

            const changed = await markConversationRead(conversationId, currentUserId);
            const readReceipts = participants.every(p => p.user.readReceiptsEnabled);

            if (changed > 0 && readReceipts) {
                const otherRooms = participants
                    .filter(p => p.userId !== currentUserId)
                    .map(p => userRoom(p.userId));
                io.to(otherRooms).emit('messages_read', { conversationId, readerId: currentUserId });
            }
        } catch (error) {
            console.error('Error al marcar como leído:', error);
        }
    });
};
