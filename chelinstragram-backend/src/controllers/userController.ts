import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * @openapi
 * /api/users/profile:
 *  get:
 *    summary: Get current user profile
 *    tags:
 *      - Users
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: User profile data
 *  patch:
 *    summary: Update profile details and avatar
 *    tags:
 *      - Users
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              displayName:
 *                type: string
 *              bio:
 *                type: string
 *              avatar:
 *                type: string
 *                format: binary
 *    responses:
 *      200:
 *        description: Profile updated successfully 
 */

export const getProfile = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                _count: {
                    select: { followers: true, following: true, posts: true }
                }
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { displayName, bio } = req.body;

    // Handle avatar upload if a file is present
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                displayName,
                bio,
                ...(avatarUrl && { avatarUrl }) // Only update if a new file was uploaded
            }
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

/**
 * @openapi
 * /api/users/search:
 *  get:
 *    summary: Search for users by username or display name
 *    tags:
 *      - Users
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: query
 *        required: true
 *        schema:
 *          type: string
 *        description: Name or username to search for
 *    responses:
 *      200:
 *        description: List of matching users
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  username:
 *                    type: string
 *                  displayName:
 *                    type: string
 *                  avatarUrl:
 *                    type: string
 */
export const searchUsers = async (req: AuthRequest, res: Response) => {
    const { query } = req.query; // Get search term from URL: ?query=chela
    const { userId } = req.user!;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: userId } }, // Don't show me in the results
                    {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { displayName: { contains: query, mode: 'insensitive' } }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true
            },
            take: 10 // Limit results for better performance
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search users' });
    }
};

/**
 * @openapi
 * /api/users/{userId}:
 *  get:
 *    summary: Get public profile and posts of another user
 *    tags:
 *      - Users
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: path
 *        name: userId
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: User profile with posts and stats
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                _count:
 *                  type: object
 *                  properties:
 *                    followers:
 *                      type: integer
 *                    following:
 *                      type: integer
 *                    posts:
 *                      type: integer
 *                posts:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      imageUrl:
 *                        type: string
 */
export const getUserById = async (req: AuthRequest, res: Response) => {
    const { userId: targetUserId } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId as string },
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                posts: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: { select: { likes: true, comments: true } }
                    }
                },
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        posts: true
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

/**
 * @openapi
 * /api/users/follow:
 *  post:
 *    summary: Follow or unfollow a user
 *    tags:
 *      - Users
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              followingId:
 *                type: string
 *                description: The ID of the user to follow/unfollow
 *    responses:
 *      200:
 *        description: Status updated (Followed or Unfollowed)
 *      400:
 *        description: Cannot follow yourself
 *      401:
 *        description: Unauthorized
 */
export const toggleFollow = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!; // Your ID
    const { followingId } = req.body; // The ID of the user you want to follow (e.g., Chela)

    if (userId === followingId) {
        return res.status(400).json({ error: "You cannot follow yourself" });
    }

    try {
        // Check if the follow relationship already exists
        const existingFollow = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: followingId,
                },
            },
        });

        if (existingFollow) {
            // Unfollow
            await prisma.follow.delete({
                where: { id: existingFollow.id },
            });
            return res.json({ message: "Unfollowed successfully" });
        }

        // Follow
        await prisma.follow.create({
            data: {
                followerId: userId,
                followingId: followingId,
            },
        });

        res.status(201).json({ message: "Followed successfully" });
    } catch (error) {
        console.error("FOLLOW ERROR:", error);
        res.status(500).json({ error: "Failed to update follow status" });
    }
};