import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/database';

/**
 * @openapi
 * /api/auth/login:
 *  post:
 *    summary: Authenticate a user
 *    tags:
 *      - Auth
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                example: testUser
 *              password:
 *                type: string
 *                example: password123
 *    responses:
 *      200:
 *        description: Successful login
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *                user:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: string
 *                    username:
 *                      type: string
 *      401:
 *        description: Invalid credentials
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                error:
 *                  type: string
 */
export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    let JWT_SECRET = process.env.JWT_SECRET || "";

    try {
        // 1. Find user by username
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // 2. Check password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // 3. Generate JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 4. Return user info and token
        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Something went wrong on the server' });
    }
};