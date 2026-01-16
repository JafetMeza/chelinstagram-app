import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * @openapi
 * /api/chat/conversations:
 *  get:
 *    summary: Get all conversations and messages for the logged-in user
 *    tags:
 *      - Chat
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: List of conversations with participants and messages
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  messages:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        id:
 *                          type: string
 *                        content:
 *                          type: string
 *                        senderId:
 *                          type: string
 *                  participants:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        user:
 *                          type: object
 *                          properties:
 *                            username:
 *                              type: string
 *                            displayName:
 *                              type: string
 *      401:
 *        description: Unauthorized - Token missing or invalid
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!; // Provided by our middleware

    try {
        // Find conversations where the logged-in user is a participant
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
                                username: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50 // Get the last 50 messages
                }
            }
        });

        res.json(conversations);
    } catch (error) {
        console.error('Chat error:', error);
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
    const { userId } = req.user!; // Secured sender ID
    const { conversationId, content } = req.body;

    try {
        const newMessage = await prisma.message.create({
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
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};