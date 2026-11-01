import { Message, MessageReaction } from '@prisma/client';
import { prisma } from '../config/database';

export const messageInclude = {
    sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    reactions: { select: { userId: true, type: true } },
    // Mensaje citado (réplica). Se sanea en serializeMessage si fue borrado
    replyTo: {
        select: {
            id: true,
            content: true,
            deletedAt: true,
            senderId: true,
            sender: { select: { id: true, username: true, displayName: true } }
        }
    }
} as const;

type ReplyPreview = {
    id: string;
    content: string;
    deletedAt: Date | null;
    senderId: string;
    sender?: { id: string; username: string; displayName: string | null; };
};

type MessageWithRelations = Message & {
    sender?: { id: string; username: string; displayName: string | null; avatarUrl: string | null; };
    reactions?: Pick<MessageReaction, 'userId' | 'type'>[];
    replyTo?: ReplyPreview | null;
};

// El contenido del mensaje citado tampoco se expone si fue borrado
const serializeReplyTo = (replyTo: ReplyPreview | null | undefined) => {
    if (!replyTo) return null;
    const isDeleted = !!replyTo.deletedAt;
    return { ...replyTo, content: isDeleted ? '' : replyTo.content };
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
        replyTo: serializeReplyTo(message.replyTo),
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

// Una réplica solo puede citar un mensaje de la MISMA conversación (evita filtrar contenido ajeno)
export const isValidReplyTarget = async (replyToId: string, conversationId: string) => {
    const target = await prisma.message.findFirst({
        where: { id: replyToId, conversationId },
        select: { id: true }
    });
    return !!target;
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
