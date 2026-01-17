import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * @openapi
 * /api/posts:
 *  post:
 *    summary: Upload a new photo with location and pin status
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
 *                example: "A beautiful day in Wageningen! 🇳🇱"
 *              location:
 *                type: string
 *                example: "Wageningen, Netherlands"
 *              isPinned:
 *                type: boolean
 *                default: false
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
 *                location:
 *                  type: string
 *                isPinned:
 *                  type: boolean
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
 *                  location:
 *                    type: string
 *                  isPinned:
 *                    type: boolean
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
    const { caption, location, isPinned } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    try {
        const post = await prisma.post.create({
            data: {
                caption,
                location,
                imageUrl,
                authorId: userId,
                // Convert the incoming string/any value to a strict boolean
                isPinned: isPinned === 'true' || isPinned === true,
            },
        });
        res.status(201).json(post);
    } catch (error) {
        console.error("CREATE POST ERROR:", error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};

export const getFeed = async (req: AuthRequest, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
            orderBy: [
                { isPinned: 'desc' }, // Pinned posts (true) come before unpinned (false)
                { createdAt: 'desc' } // Newest posts come after pinned ones
            ],
            include: {
                author: { select: { username: true, displayName: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });
        res.json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
};

/**
 * @openapi 
 * /api/posts/{postId}:
 *  patch:
 *    summary: Edit a post (Caption, Location, or Pin status)
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: postId
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              caption:
 *                type: string
 *              location:
 *                type: string
 *              isPinned:
 *                type: boolean
 *    responses:
 *      200:
 *        description: Post updated successfully
 *      403:
 *        description: Forbidden - You don't own this post 
 */

export const updatePost = async (req: AuthRequest, res: Response) => {
    const postId = req.params.postId as string;
    const { caption, location, isPinned } = req.body;
    const { userId } = req.user!;

    if (!postId) {
        return res.status(400).json({ error: "Post ID is required" });
    }

    try {
        // 1. Find post and verify ownership
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        if (post.authorId !== userId) {
            return res.status(403).json({ error: "Unauthorized to edit this post" });
        }

        // 2. Update with the fresh data
        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                caption: caption !== undefined ? caption : post.caption,
                location: location !== undefined ? location : post.location,
                isPinned: isPinned !== undefined ? isPinned : post.isPinned
            }
        });

        res.json(updatedPost);
    } catch (error) {
        console.error("UPDATE POST ERROR:", error);
        res.status(500).json({ error: "Failed to update post" });
    }
};