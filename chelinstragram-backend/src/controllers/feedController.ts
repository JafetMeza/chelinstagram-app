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

        // 1. Get the list of people the user follows
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });

        // 2. Extract just the IDs into an array
        const followingIds = following.map(f => f.followingId);

        // 3. Query posts where author is in followingIds OR is the user themselves
        const posts = await prisma.post.findMany({
            where: {
                OR: [
                    { authorId: { in: followingIds } },
                    { authorId: userId }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    }
                },
                likes: {
                    where: { userId: userId },
                    select: { userId: true }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        const postsWithLikeStatus = posts.map(post => ({
            ...post,
            isLikedByUser: post.likes.length > 0
        }));

        res.status(200).json(postsWithLikeStatus);
    } catch (error) {
        console.error("Feed error:", error);
        res.status(500).json({ error: "Failed to fetch feed" });
    }
};

/**
 * @openapi 
 * /api/posts/{postId}:
 *  patch:
 *    summary: Update a post (Chelfie)
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - name: postId
 *        in: path
 *        required: true
 *        description: The unique ID of the post to update
 *        schema:
 *          type: string
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/UpdatePostRequest'
 *    responses:
 *      200:
 *        description: Post updated successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Post'
 *      400:
 *        description: Invalid input or missing Post ID
 *      403:
 *        description: Unauthorized (You are not the author of this post)
 *      404:
 *        description: Post not found
 *      500:
 *        description: Server error
 */

export const updatePost = async (req: AuthRequest, res: Response) => {
    const postId = req.params.postId as string;
    const { caption, location, isPinned } = req.body;
    const { userId } = req.user!;

    if (!postId) return res.status(400).json({ error: "Post ID is required" });

    try {
        // 1. Verify ownership (remains the same)
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return res.status(404).json({ error: "Post not found" });
        if (post.authorId !== userId) return res.status(403).json({ error: "Unauthorized" });

        // 2. Update and INCLUDE the data the frontend expects
        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                caption: caption !== undefined ? caption : post.caption,
                location: location !== undefined ? location : post.location,
                isPinned: isPinned !== undefined ? isPinned : post.isPinned
            },
            include: {
                author: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    }
                },
                likes: {
                    where: { userId: userId },
                    select: { userId: true }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        // 3. Transform to include the isLikedByUser boolean for the frontend
        const result = {
            ...updatedPost,
            isLikedByUser: updatedPost.likes.length > 0
        };

        res.json(result);
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

/**
 * @openapi
 * /api/posts/user/{username}:
 *    get:
 *      summary: Get all posts for a specific user (supports Grid and Feed views)
 *      tags:
 *        - Feed
 *      parameters:
 *        - name: username
 *          in: path
 *          required: true
 *          description: The username of the user whose grid posts are being requested.
 *          schema:
 *            type: string
 *            example: "testUser"
 *      responses:
 *        '200':
 *          description: A list of posts formatted for both grid and full feed display.
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/Post'
 *        '401':
 *          description: Unauthorized. Missing or invalid token.
 *        '404':
 *          description: User not found.
 *        '500':
 *          description: Internal server error.
 */
export const getUserPosts = async (req: AuthRequest, res: Response) => {
    const { username } = req.params;
    const userId = req.user?.userId; // Get current user ID if available for like status

    try {
        const posts = await prisma.post.findMany({
            where: {
                author: { username: username as string }
            },
            // 1. Sort by Pinned first, then by Date
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            select: {
                id: true,
                imageUrl: true,
                caption: true,
                location: true,
                isPinned: true, // Need this for the UI
                createdAt: true,
                author: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                // Include likes for the current user to keep PostCard consistent
                likes: userId ? {
                    where: { userId },
                    select: { userId: true }
                } : false,
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        // 2. Map results to include isLikedByUser boolean
        const postsWithStatus = posts.map(post => ({
            ...post,
            isLikedByUser: Array.isArray(post.likes) ? post.likes.length > 0 : false
        }));

        res.status(200).json(postsWithStatus);
    } catch (error) {
        console.error("GET USER POSTS ERROR:", error);
        res.status(500).json({ error: "Error fetching user posts" });
    }
};