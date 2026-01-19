import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * @openapi
 * /api/chat/conversations/{conversationId}:
 *  get:
 *    summary: Get all messages for a specific conversation
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
 *    responses:
 *      200:
 *        description: List of messages for the conversation
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Message'
 *      401:
 *        description: Unauthorized
 *      404:
 *        description: Conversation not found
 *      500:
 *        description: Failed to fetch messages
 */
export const getMessages = async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params; // Conversation ID

    try {
        const messages = await prisma.message.findMany({
            where: { conversationId: conversationId as string },
            include: {
                sender: {
                    select: { id: true, username: true, displayName: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: 'asc' } // Oldest to newest for the chat UI
        });

        res.json(messages);
    } catch (error) {
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

        res.json(conversations);
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

    try {
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

    try {
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
                    include: { user: { select: { username: true, displayName: true, avatarUrl: true } } }
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
                        include: { user: { select: { username: true, displayName: true, avatarUrl: true } } }
                    },
                    messages: true
                }
            });
        }

        res.status(200).json(conversation);
    } catch (error) {
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

