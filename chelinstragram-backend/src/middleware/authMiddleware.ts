import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

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
    const JWT_SECRET = process.env.JWT_SECRET || "";

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Token format invalid' });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; };
        req.user = decoded;
        next();
    } catch (error) {
        // DETECCIÓN DE EXPIRACIÓN
        if (error instanceof TokenExpiredError) {
            console.log('JWT Expired: Sending 401 for Refresh Token flow');
            return res.status(401).json({
                error: 'Token expired',
                code: 'ACCESS_TOKEN_EXPIRED' // Ayuda al front a identificar la causa
            });
        }

        // OTROS ERRORES (Token mal formado, firma incorrecta, etc.)
        console.log('JWT Verify Error:', error);
        return res.status(403).json({ error: 'Invalid token.' });
    }
};