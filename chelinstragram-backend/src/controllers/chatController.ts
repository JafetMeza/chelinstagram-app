import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

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
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  updatedAt:
 *                    type: string
 *                  participants:
 *                    type: array
 *                    items:
 *                      type: object
 *                  messages:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        content:
 *                          type: string
 *                        createdAt:
 *                          type: string
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
 *            type: object
 *            properties:
 *              conversationId:
 *                type: string
 *                example: "paste-conversation-id-here"
 *              content:
 *                type: string
 *                example: "Hey Chela, I'm testing the app! ❤️"
 *    responses:
 *      201:
 *        description: Message sent successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                content:
 *                  type: string
 *                createdAt:
 *                  type: string
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

