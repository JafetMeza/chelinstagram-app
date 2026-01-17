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