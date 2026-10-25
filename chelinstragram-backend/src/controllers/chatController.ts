import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';
import { MAX_MESSAGES_PAGE_SIZE } from '../config/chat';
import {
    areReadReceiptsEnabled,
    getConversationParticipantIds,
    markConversationRead,
    messageInclude,
    serializeMessage
} from '../helper/chatHelper';
import { emitToUsers } from '../sockets/socketHandler';

// Shared by REST controllers and socket handlers to guard conversation access
export const isConversationParticipant = async (conversationId: string, userId: string) => {
    if (!conversationId || !userId) return false;
    const participant = await prisma.participant.findUnique({
        where: { conversationId_userId: { conversationId, userId } }
    });
    return !!participant;
};

/**
 * @openapi
 * /api/chat/conversations/{conversationId}:
 *  get:
 *    summary: Get the messages of a conversation (cursor pagination when `limit` is sent)
 *    description: >
 *      Without `limit` it returns every message as an array (legacy).
 *      With `limit` it returns the newest page and `cursor` loads older messages.
 *      Messages in `data` are always sorted from oldest to newest.
 *    tags:
 *      - Chat
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - name: conversationId
 *        in: path
 *        required: true
 *        description: The ID of the conversation
 *        schema:
 *          type: string
 *      - name: limit
 *        in: query
 *        description: Page size (max 100)
 *        schema:
 *          type: integer
 *      - name: cursor
 *        in: query
 *        description: Id of the oldest message already loaded; returns the messages before it
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: Messages of the conversation
 *        content:
 *          application/json:
 *            schema:
 *              oneOf:
 *                - type: array
 *                  items:
 *                    $ref: '#/components/schemas/Message'
 *                - $ref: '#/components/schemas/MessagesPage'
 *      401:
 *        description: Unauthorized
 *      403:
 *        description: Not a participant of this conversation
 *      500:
 *        description: Failed to fetch messages
 */
export const getMessages = async (req: AuthRequest, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const currentUserId = req.user?.userId;
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : null;
    const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : null;
    const limit = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, MAX_MESSAGES_PAGE_SIZE) : null;

    try {
        if (!currentUserId || !(await isConversationParticipant(conversationId, currentUserId))) {
            return res.status(403).json({ error: 'You are not a participant of this conversation' });
        }

        const readReceipts = await areReadReceiptsEnabled(conversationId);

        // Marcamos como leídos al abrir el chat (solo en la primera página)
        if (!cursor) {
            const changed = await markConversationRead(conversationId, currentUserId);
            if (changed > 0 && readReceipts) {
                const otherIds = (await getConversationParticipantIds(conversationId)).filter(id => id !== currentUserId);
                emitToUsers(otherIds, 'messages_read', { conversationId, readerId: currentUserId });
            }
        }

        if (!limit) {
            const messages = await prisma.message.findMany({
                where: { conversationId },
                include: messageInclude,
                orderBy: { createdAt: 'asc' }
            });
            return res.json(messages.map(m => serializeMessage(m, readReceipts)));
        }

        // Página más reciente primero; pedimos uno extra para saber si hay más
        const page = await prisma.message.findMany({
            where: { conversationId },
            include: messageInclude,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = page.length > limit;
        const messages = page.slice(0, limit).reverse();

        res.json({
            data: messages.map(m => serializeMessage(m, readReceipts)),
            meta: {
                cursor,
                nextCursor: hasMore ? messages[0]?.id ?? null : null,
                hasMore,
                readReceipts
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

/**
 * @openapi
 * /api/chat/conversations:
 *  get:
 *    summary: Get inbox (conversations with last message preview)
 *    tags:
 *      - Chat
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: List of conversations with the latest message
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items: 
 *                  $ref: '#/components/schemas/Conversation'
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;

    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' }, // Get newest first
                    take: 1, // Only pull the very last message for the preview
                }
            },
            orderBy: {
                updatedAt: 'desc' // Moves the conversation with the newest message to the top
            }
        });

        // Never leak the content of a deleted message through the preview
        res.json(conversations.map(c => ({
            ...c,
            messages: c.messages.map(m => ({ ...m, content: m.deletedAt ? '' : m.content }))
        })));
    } catch (error) {
        console.error('Inbox error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};


/**
 * @openapi
 * /api/chat/messages:
 *  post:
 *    summary: Send a new message to a conversation
 *    tags:
 *      - Chat
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/SendMessageRequest'
 *    responses:
 *      201:
 *        description: Message sent successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Message'
 *      401:
 *        description: Unauthorized
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { conversationId, content } = req.body;

    if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    try {
        if (!(await isConversationParticipant(conversationId, userId))) {
            return res.status(403).json({ error: 'You are not a participant of this conversation' });
        }

        // 1. Create the message and update the Conversation's updatedAt in one transaction
        const [newMessage] = await prisma.$transaction([
            prisma.message.create({
                data: {
                    content,
                    senderId: userId,
                    conversationId,
                },
                include: {
                    sender: {
                        select: { username: true, displayName: true }
                    }
                }
            }),
            // 2. This is the key: Update the parent conversation timestamp
            prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() }
            })
        ]);

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

/**
 * @openapi
 * /api/chat/start:
 *  post:
 *    summary: Start or find a conversation with another user
 *    tags:
 *      - Chat
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              recipientId:
 *                type: string
 *                example: "user-uuid-here"
 *    responses:
 *      200:
 *        description: Conversation object
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items: 
 *                  $ref: '#/components/schemas/Conversation'
 *      500:
 *        description: Error
 */
export const startConversation = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { recipientId } = req.body;

    if (typeof recipientId !== 'string' || !recipientId || recipientId === userId) {
        return res.status(400).json({ error: 'A valid recipient is required' });
    }

    try {
        const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
        if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

        // Find if a conversation already exists between these two
        let conversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { userId: userId } } },
                    { participants: { some: { userId: recipientId } } }
                ]
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
                },
                messages: { take: 1, orderBy: { createdAt: 'desc' } }
            }
        });

        // If not, create a new one
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participants: {
                        create: [
                            { userId: userId },
                            { userId: recipientId }
                        ]
                    }
                },
                include: {
                    participants: {
                        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
                    },
                    messages: true
                }
            });
        }

        res.status(200).json(conversation);
    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({ error: 'Failed to start conversation' });
    }
};
/**
 * @openapi
 * /api/chat/conversations/{conversationId}:
 *     delete:
 *       summary: Delete a conversation and all its messages
 *       tags:
 *         - Chat
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - name: conversationId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         204:
 *           description: Successfully deleted
 *         403:
 *           description: Not a participant of this conversation
 *         500:
 *           description: Server error
*/
export const deleteConversation = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { conversationId } = req.params;

    try {
        // 1. Verify the requester is actually in this conversation
        const isParticipant = await prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: conversationId as string,
                    userId: userId
                }
            }
        });

        if (!isParticipant) {
            return res.status(403).json({ error: "You don't have permission to delete this conversation" });
        }

        // 2. Perform deletion in a transaction
        // Note: If your Prisma schema has `onDelete: Cascade` on the relations, 
        // you only need the last line. If not, this order is required:
        await prisma.$transaction([
            prisma.message.deleteMany({ where: { conversationId: conversationId as string } }),
            prisma.participant.deleteMany({ where: { conversationId: conversationId as string } }),
            prisma.conversation.delete({ where: { id: conversationId as string } }),
        ]);

        res.status(204).send();
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
};

