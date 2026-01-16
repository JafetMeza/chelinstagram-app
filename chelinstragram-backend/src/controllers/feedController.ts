import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * @openapi
 * /api/posts:
 *  post:
 *    summary: Upload a new photo to the feed
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              caption:
 *                type: string
 *                example: "A beautiful day in the Netherlands! 🇳🇱"
 *              image:
 *                type: string
 *                format: binary
 *    responses:
 *      201:
 *        description: Post created successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                imageUrl:
 *                  type: string
 *                caption:
 *                  type: string
 *      401:
 *        description: Unauthorized
 *  get:
 *    summary: Get all feed posts
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: List of posts for the feed
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  imageUrl:
 *                    type: string
 *                  caption:
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
 *                  _count:
 *                    type: object
 *                    properties:
 *                      likes:
 *                        type: integer
 *                      comments:
 *                        type: integer
*/
export const createPost = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { caption } = req.body;

    // For now, we'll assume the file path from multer
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    try {
        const post = await prisma.post.create({
            data: {
                caption,
                imageUrl,
                authorId: userId,
            },
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create post' });
    }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { username: true, displayName: true, avatarUrl: true }
                },
                _count: { select: { likes: true, comments: true } }
            }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
};