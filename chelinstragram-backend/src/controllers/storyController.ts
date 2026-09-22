import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadImage, VideoProcessingOptions } from '../helper/imageHelper';
import { notifyNewStory } from '../sockets/socketHandler';

const DEFAULT_IMAGE_DURATION = 15; // seconds, matches your Story.duration default
const MAX_STORY_DURATION = 30;     // seconds — arbitrary cap for trimmed videos, adjust freely
const MIN_LIFETIME_MINUTES = 5;
const MAX_LIFETIME_MINUTES = 3 * 24 * 60; // 3 days = 4320 minutes
const DEFAULT_LIFETIME_MINUTES = 24 * 60; // 1 day, used if the client sends nothing/invalid


const resolveLifetimeMinutes = (raw: unknown): number => {
    const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(parsed)) return DEFAULT_LIFETIME_MINUTES;
    return Math.min(MAX_LIFETIME_MINUTES, Math.max(MIN_LIFETIME_MINUTES, parsed));
};

/**
 * @openapi
 * /api/stories:
 *  post:
 *    summary: Upload a new story (photo or video), visible to followers for 24h
 *    tags:
 *      - Stories
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            $ref: '#/components/schemas/CreateStoryRequest'
 *    responses:
 *      201:
 *        description: Story created successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Story'
 *      400:
 *        description: No media provided
 *      401:
 *        description: Unauthorized
 *  get:
 *    summary: Get the story tray (own stories + followed users' stories), grouped by author
 *    tags:
 *      - Stories
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: Story groups, own group first, then groups with unseen stories first
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/StoryGroup'
 */
export const createStory = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const { startTime, endTime, isMuted, cropX, cropY, cropSize, lifetimeMinutes } = req.body;

    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No media provided' });
        }

        const mediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        const resolvedLifetime = resolveLifetimeMinutes(lifetimeMinutes); // 🟢 NEW

        let duration = DEFAULT_IMAGE_DURATION;
        let videoOptions: VideoProcessingOptions | undefined;

        if (mediaType === 'VIDEO') {
            const parsedStart = startTime !== undefined ? parseFloat(startTime) : undefined;
            const parsedEnd = endTime !== undefined ? parseFloat(endTime) : undefined;

            videoOptions = {
                startTime: parsedStart,
                endTime: parsedEnd,
                isMuted: isMuted === 'true' || isMuted === true,
                crop: (cropX !== undefined && cropY !== undefined && cropSize !== undefined) ? {
                    x: parseInt(cropX, 10),
                    y: parseInt(cropY, 10),
                    size: parseInt(cropSize, 10),
                } : undefined,
            };

            if (parsedStart !== undefined && parsedEnd !== undefined && parsedEnd > parsedStart) {
                duration = Math.min(MAX_STORY_DURATION, Math.round(parsedEnd - parsedStart));
            }
        }

        const mediaUrl = await uploadImage(file, videoOptions);

        const story = await prisma.story.create({
            data: {
                mediaUrl,
                mediaType,
                duration,
                expiresAt: new Date(Date.now() + resolvedLifetime * 60 * 1000), // 🟢 CHANGED
                authorId: userId,
            },
            include: {
                author: { select: { username: true, displayName: true, avatarUrl: true } }
            }
        });

        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            select: { followerId: true }
        });
        notifyNewStory(followers.map(f => f.followerId), story).catch(err =>
            console.error('Failed to notify followers of new story:', err)
        );

        res.status(201).json(story);
    } catch (error) {
        console.error('CREATE STORY ERROR:', error);
        res.status(500).json({ error: 'Failed to create story' });
    }
};

export const getStoriesFeed = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;

    try {
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        const authorIds = [...following.map(f => f.followingId), userId];

        const stories = await prisma.story.findMany({
            where: {
                authorId: { in: authorIds },
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'asc' },
            include: {
                author: { select: { username: true, displayName: true, avatarUrl: true } },
                views: { where: { userId }, select: { id: true } }
            }
        });

        type Group = {
            author: { username: string; displayName: string | null; avatarUrl: string | null; };
            stories: any[];
            hasUnseen: boolean;
            isOwn: boolean;
        };
        const groupsMap = new Map<string, Group>();

        for (const story of stories) {
            if (!groupsMap.has(story.authorId)) {
                groupsMap.set(story.authorId, {
                    author: story.author,
                    stories: [],
                    hasUnseen: false,
                    isOwn: story.authorId === userId,
                });
            }
            const group = groupsMap.get(story.authorId)!;
            const isViewedByUser = story.views.length > 0;

            if (!isViewedByUser && story.authorId !== userId) {
                group.hasUnseen = true;
            }

            group.stories.push({
                id: story.id,
                mediaUrl: story.mediaUrl,
                mediaType: story.mediaType,
                duration: story.duration,
                expiresAt: story.expiresAt,
                createdAt: story.createdAt,
                isViewedByUser,
            });
        }

        // Own stories first, then unseen-before-seen among the rest
        const groups = Array.from(groupsMap.values())
            .sort((a, b) => {
                if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
                if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
                return 0;
            })
            .map(({ isOwn, ...rest }) => rest);

        res.status(200).json(groups);
    } catch (error) {
        console.error('GET STORIES FEED ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
};

/**
 * @openapi
 * /api/stories/{storyId}/view:
 *  post:
 *    summary: Mark a story as viewed by the current user
 *    tags:
 *      - Stories
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - name: storyId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: View recorded (idempotent — repeat calls are a no-op)
 *      404:
 *        description: Story not found or expired
 */
export const viewStory = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const storyId = req.params.storyId as string;

    try {
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story || story.expiresAt < new Date()) {
            return res.status(404).json({ error: 'Story not found or expired' });
        }

        // Skip recording the author viewing their own story
        if (story.authorId === userId) {
            return res.status(200).json({ message: 'Own story, view not recorded' });
        }

        await prisma.storyView.upsert({
            where: { storyId_userId: { storyId, userId } },
            update: {},
            create: { storyId, userId },
        });

        res.status(200).json({ message: 'View recorded' });
    } catch (error) {
        console.error('VIEW STORY ERROR:', error);
        res.status(500).json({ error: 'Failed to record view' });
    }
};

/**
 * @openapi
 * /api/stories/{storyId}/viewers:
 *  get:
 *    summary: Get the list of users who viewed a story (author only)
 *    tags:
 *      - Stories
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - name: storyId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: List of viewers, most recent first
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/StoryViewer'
 *      403:
 *        description: Unauthorized (not the story's author)
 *      404:
 *        description: Story not found
 */
export const getStoryViewers = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const storyId = req.params.storyId as string;

    try {
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story) return res.status(404).json({ error: 'Story not found' });
        if (story.authorId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        const views = await prisma.storyView.findMany({
            where: { storyId },
            orderBy: { viewedAt: 'desc' },
            include: {
                user: { select: { username: true, displayName: true, avatarUrl: true } }
            }
        });

        const viewers = views.map(v => ({
            username: v.user.username,
            displayName: v.user.displayName,
            avatarUrl: v.user.avatarUrl,
            viewedAt: v.viewedAt,
        }));

        res.status(200).json(viewers);
    } catch (error) {
        console.error('GET STORY VIEWERS ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch viewers' });
    }
};

/**
 * @openapi
 * /api/stories/{storyId}:
 *  delete:
 *    summary: Delete a story
 *    tags:
 *      - Stories
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - name: storyId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: Story deleted
 *      403:
 *        description: Unauthorized
 *      404:
 *        description: Story not found
 */
export const deleteStory = async (req: AuthRequest, res: Response) => {
    const { userId } = req.user!;
    const storyId = req.params.storyId as string;

    try {
        const story = await prisma.story.findUnique({ where: { id: storyId } });
        if (!story) return res.status(404).json({ error: 'Story not found' });
        if (story.authorId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        // Prisma cascades StoryView deletion per your schema's onDelete: Cascade
        await prisma.story.delete({ where: { id: storyId } });
        res.status(200).json({ message: 'Story deleted successfully' });
    } catch (error) {
        console.error('DELETE STORY ERROR:', error);
        res.status(500).json({ error: 'Failed to delete story' });
    }
};