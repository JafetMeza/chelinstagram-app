import { Response } from 'express';
import { prisma } from '../../prisma/database';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadImage } from "../helper/imageHelper";
import { Post, User } from "../../generated/prisma/client";

type PostWithAuthorAndLikes = Post & {
    author: Partial<User>;
    likes: { id: string; }[];
};


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
 *    summary: Get the feed of posts with optional pagination
 *    tags:
 *      - Feed
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *     - in: query
 *       name: page
 *       description: Page number
 *       schema:
 *         type: integer
 *     - in: query
 *       name: limit
 *       schema:
 *         type: integer
 *       description: Number of posts per page
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

    try {
        const file = req.file; // Populated by multer middleware

        if (!file) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const imageUrl = await uploadImage(file);

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
        const page = req.query.page ? parseInt(req.query.page as string) : null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        const authorIds = [...following.map(f => f.followingId), userId];

        const queryOptions = {
            where: {
                authorId: { in: authorIds }
            },
            orderBy: {
                createdAt: 'desc' as const
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
                    select: { id: true }
                }
            },
            ...(page && limit ? {
                skip: (page - 1) * limit,
                take: limit
            } : {})
        };

        const [posts, totalPosts] = await prisma.$transaction([
            prisma.post.findMany(queryOptions),
            prisma.post.count({ where: queryOptions.where })
        ]);

        const typedPosts = posts as PostWithAuthorAndLikes[];

        const formattedPosts = typedPosts.map(post => ({
            ...post,
            isLikedByUser: post.likes.length > 0,
            likes: undefined
        }));

        if (page && limit) {
            return res.status(200).json({
                data: formattedPosts,
                meta: {
                    total: totalPosts,
                    page,
                    limit,
                    totalPages: Math.ceil(totalPosts / limit),
                    hasNextPage: page * limit < totalPosts
                }
            });
        }

        res.status(200).json(formattedPosts);
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

    try {
        const existingPost = await prisma.post.findUnique({ where: { id: postId } });
        if (!existingPost) return res.status(404).json({ error: "Post not found" });
        if (existingPost.authorId !== userId) return res.status(403).json({ error: "Unauthorized" });

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                caption: caption !== undefined ? caption : existingPost.caption,
                location: location !== undefined ? location : existingPost.location,
                isPinned: isPinned !== undefined ? (isPinned === 'true' || isPinned === true) : existingPost.isPinned
            },
            include: {
                author: {
                    select: { username: true, displayName: true, avatarUrl: true }
                },
                likes: {
                    where: { userId },
                    select: { id: true }
                }
            }
        });

        res.json({
            ...updatedPost,
            isLikedByUser: updatedPost.likes.length > 0,
            likes: undefined
        });
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ error: "Failed to update" });
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
 *  @openapi
 * /api/posts/user/{username}:
 *   get:
 *     summary: Get all posts for a specific user (supports Grid and Feed views)
 *     tags:
 *       - Feed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: username
 *         in: path
 *         required: true
 *         description: The username of the user whose posts are being requested.
 *         schema:
 *           type: string
 *           example: "abraham_meza"
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         description: Number of posts per page
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A list of posts formatted for both grid and full feed display.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *       '401':
 *         description: Unauthorized. Missing or invalid token.
 *       '404':
 *         description: User not found.
 *       '500':
 *         description: Internal server error.
 */
export const getUserPosts = async (req: AuthRequest, res: Response) => {
    const { username } = req.params;
    const userId = req.user?.userId; // ID del usuario actual para el check de isLiked

    try {
        // 1. Parámetros de paginación
        const page = req.query.page ? parseInt(req.query.page as string) : null;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : null;

        // 2. Definición de la consulta
        const queryOptions: any = {
            where: {
                author: { username: username as string }
            },
            // Ordenamos: primero fijados, luego por fecha
            orderBy: [
                { isPinned: 'desc' as const },
                { createdAt: 'desc' as const }
            ],
            include: {
                author: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                // Traemos el like solo si el usuario logueado lo dio
                likes: userId ? {
                    where: { userId },
                    select: { id: true }
                } : false
            }
        };

        // 3. Aplicar paginación si vienen los queries
        if (page && limit) {
            queryOptions.skip = (page - 1) * limit;
            queryOptions.take = limit;
        }

        // 4. Ejecutar consultas
        const [posts, totalPosts] = await prisma.$transaction([
            prisma.post.findMany(queryOptions),
            prisma.post.count({ where: queryOptions.where })
        ]);

        const typedPosts = posts as PostWithAuthorAndLikes[];

        // 5. Mapear resultados usando tus contadores denormalizados
        const formattedPosts = typedPosts.map(post => ({
            ...post,
            isLikedByUser: Array.isArray(post.likes) ? post.likes.length > 0 : false,
            likes: undefined // Limpieza
        }));

        // 6. Respuesta con Metadata
        if (page && limit) {
            return res.status(200).json({
                data: formattedPosts,
                meta: {
                    total: totalPosts,
                    page,
                    limit,
                    totalPages: Math.ceil(totalPosts / limit),
                    hasNextPage: page * limit < totalPosts
                }
            });
        }

        res.status(200).json(formattedPosts);
    } catch (error) {
        console.error("GET USER POSTS ERROR:", error);
        res.status(500).json({ error: "Error fetching user posts" });
    }
};