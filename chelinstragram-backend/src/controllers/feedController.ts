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
    const { userId } = req.user!;

    try {
        // 1. Get the IDs of everyone you follow
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

        // 2. Add your own ID to the list so you see your own posts too
        const authorIds = [...followingIds, userId];

        // 3. Filter the feed
        const posts = await prisma.post.findMany({
            where: {
                authorId: { in: authorIds }
            },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                author: { select: { username: true, displayName: true, avatarUrl: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch personalized feed' });
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

/**
 * @openapi
 * /api/posts/{postId}:
 *  delete:
 *    summary: Delete a post
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
 *    responses:
 *      200:
 *        description: Post deleted
 *      403:
 *        description: Unauthorized
 */
export const deletePost = async (req: AuthRequest, res: Response) => {
    const postId = req.params.postId as string;
    const { userId } = req.user!;

    try {
        const post = await prisma.post.findUnique({ where: { id: postId } });

        if (!post) return res.status(404).json({ error: "Post not found" });
        if (post.authorId !== userId) return res.status(403).json({ error: "Unauthorized" });

        // This will also delete related Likes and Comments due to Prisma's relation settings
        await prisma.post.delete({ where: { id: postId } });

        res.json({ message: "Post deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete post" });
    }
};