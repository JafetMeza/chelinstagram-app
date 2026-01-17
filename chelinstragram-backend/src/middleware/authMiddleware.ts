import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * @openapi
 * components:
 *  securitySchemes:
 *      bearerAuth:
 *          type: http
 *      scheme: bearer
 *          bearerFormat: JWT
 */

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        username: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    let JWT_SECRET = process.env.JWT_SECRET || "";

    if (!authHeader) {
        console.log('Error: No header found');
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        console.log('Error: Format should be "Bearer <token>"');
        return res.status(401).json({ error: 'Token format invalid' });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; };
        console.log('Success! Decoded User:', decoded.username);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('JWT Verify Error:', error);
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};