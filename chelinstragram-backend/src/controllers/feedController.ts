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
 *            $ref: '#/components/schemas/CreatePostRequest'
 *    responses:
 *      201:
 *        description: Post created successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Post'
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
 *                $ref: '#/components/schemas/Post'
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
        const { userId } = req.user!;

        const posts = await prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    }
                },
                // This checks if the current user is among the people who liked it
                likes: {
                    where: {
                        userId: userId
                    },
                    select: {
                        userId: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        // Map the results to add a simple boolean: "isLikedByUser"
        const postsWithLikeStatus = posts.map(post => ({
            ...post,
            isLikedByUser: post.likes.length > 0
        }));

        res.status(200).json(postsWithLikeStatus);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch feed" });
    }
};

/**
 * @openapi 
 * /api/posts:
 *  get:
 *    summary: Get all feed posts
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      '200':
 *        description: List of posts for the feed
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Post'
 *  post:
 *    summary: Upload a new photo
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            $ref: '#/components/schemas/CreatePostRequest'
 *    responses:
 *      '201':
 *        description: Post created successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Post'
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