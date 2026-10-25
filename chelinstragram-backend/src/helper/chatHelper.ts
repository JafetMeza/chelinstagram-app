import { Message, MessageReaction } from '@prisma/client';
import { prisma } from '../config/database';

export const messageInclude = {
    sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    reactions: { select: { userId: true, type: true } }
} as const;

type MessageWithRelations = Message & {
    sender?: { id: string; username: string; displayName: string | null; avatarUrl: string | null; };
    reactions?: Pick<MessageReaction, 'userId' | 'type'>[];
};

/**
 * Formato público de un mensaje:
 * - Un mensaje borrado nunca expone su contenido ni sus reacciones.
 * - `isRead` solo se expone si ambos participantes tienen activado el "visto".
 */
export const serializeMessage = (message: MessageWithRelations, readReceipts: boolean) => {
    const isDeleted = !!message.deletedAt;
    return {
        ...message,
        content: isDeleted ? '' : message.content,
        reactions: isDeleted ? [] : (message.reactions ?? []),
        isRead: readReceipts ? message.isRead : undefined,
    };
};

export const getConversationParticipantIds = async (conversationId: string) => {
    const participants = await prisma.participant.findMany({
        where: { conversationId },
        select: { userId: true }
    });
    return participants.map(p => p.userId);
};

// Regla recíproca: el "visto" solo funciona si todos los participantes lo tienen activado
export const areReadReceiptsEnabled = async (conversationId: string) => {
    const participants = await prisma.participant.findMany({
        where: { conversationId },
        select: { user: { select: { readReceiptsEnabled: true } } }
    });
    return participants.length > 0 && participants.every(p => p.user.readReceiptsEnabled);
};

// Marca como leídos los mensajes que recibió `readerId`. Devuelve cuántos cambiaron.
export const markConversationRead = async (conversationId: string, readerId: string) => {
    const { count } = await prisma.message.updateMany({
        where: {
            conversationId,
            senderId: { not: readerId },
            isRead: false
        },
        data: { isRead: true }
    });
    return count;
};
