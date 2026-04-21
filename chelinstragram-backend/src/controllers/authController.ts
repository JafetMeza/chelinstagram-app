import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/database';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "fallback_refresh_secret";

const generateTokens = (user: { id: string, username: string; }) => {
    const accessToken = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET!,
        { expiresIn: '15m' }
    );

    // Añadimos un ID único al token (jti) para que siempre sea diferente
    const refreshToken = jwt.sign(
        {
            userId: user.id,
            version: crypto.randomBytes(16).toString('hex') // 👈 Esto garantiza un token único
        },
        REFRESH_SECRET!,
        { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
};

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
 *            $ref: '#/components/schemas/LoginRequest'
 *    responses:
 *      200:
 *        description: Successful login
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/AuthResponse'
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

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        // Guardar Refresh Token en la DB
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken }
        });

        // Enviar Refresh Token en una Cookie HTTP-Only
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
        });

        res.json({
            message: 'Login successful!',
            accessToken, // El front guarda este en memoria/estado
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @openapi
 * /api/auth/refresh:
 *  post:
 *    summary: Refresh the access token using a refresh token cookie
 *    tags:
 *      - Auth
 *    responses:
 *      200:
 *        description: New access token generated successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                accessToken:
 *                  type: string
 *                  description: The new short-lived JWT
 *      401:
 *        description: No refresh token provided or session expired
 *      403:
 *        description: Invalid or revoked refresh token
 */
export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string; };
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });

        // Validar que el token de la cookie coincida con el de la DB
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ error: "Invalid refresh token" });
        }

        const tokens = generateTokens(user);

        // Opcional: Rotar el refresh token (actualizarlo en DB y Cookie)
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: tokens.refreshToken }
        });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken: tokens.accessToken });
    } catch (e) {
        return res.status(403).json({ error: "Expired or invalid refresh token" });
    }
};