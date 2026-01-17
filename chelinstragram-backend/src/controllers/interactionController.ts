import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * @openapi
 * /api/interactions/like:
 *  post:
 *    summary: Toggle a like on a post
 *    tags:
 *      - Interactions
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              postId:
 *                type: string
 *    responses:
 *      200:
 *        description: Like toggled successfully
 *      401:
 *        description: Unauthorized
*/

export const toggleLike = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { postId } = req.body;

    try {
        // Check if like exists
        const existingLike = await prisma.like.findUnique({
            where: {
                postId_userId: { postId, userId }
            }
        });

        if (existingLike) {
            await prisma.like.delete({
                where: { id: existingLike.id }
            });
            return res.json({ message: 'Post unliked' });
        }

        await prisma.like.create({
            data: { postId, userId }
        });
        res.status(201).json({ message: 'Post liked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle like' });
    }
};

/**
 * @openapi
 * /api/interactions/comment:
 *  post:
 *    summary: Add a comment to a post
 *    tags:
 *      - Interactions
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              postId:
 *                type: string
 *              content:
 *                type: string
 *                example: "Que hermosa foto, Graciela! ❤️"
 *    responses:
 *      201:
 *        description: Comment created
 *      401:
 *        description: Unauthorized
 */

export const addComment = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { postId, content } = req.body;

    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                postId,
                authorId: userId
            },
            include: {
                author: { select: { username: true, displayName: true } }
            }
        });
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
};


/**
 * @openapi
 * /api/interactions/comments/{postId}:
 *  get:
 *    summary: Get all comments for a specific post
 *    tags:
 *      - Interactions
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: postId
 *        required: true
 *        schema:
 *          type: string
 *        description: The ID of the post to get comments for
 *    responses:
 *      200:
 *        description: List of comments
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  content:
 *                    type: string
 *                  createdAt:
 *                    type: string
 *                  author:
 *                    type: object
 *                    properties:
 *                      username:
 *                        type: string
 *                      displayName:
 *                        type: string
 *      401:
 *        description: Unauthorized
 */
export const getCommentsByPost = async (req: AuthRequest, res: Response) => {
    // Casting to string ensures Prisma is happy with the type
    const postId = req.params.postId as string;

    if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
    }

    try {
        const comments = await prisma.comment.findMany({
            where: {
                postId: postId // Now the types match perfectly
            },
            orderBy: { createdAt: 'asc' },
            include: {
                author: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json(comments);
    } catch (error) {
        console.error("GET COMMENTS ERROR:", error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};