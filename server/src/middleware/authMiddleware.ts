import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getJwtSecret } from '../config/jwt.js';

interface AuthRequest extends Request {
    user?: any;
}

interface DecodedToken {
    id: string;
    mfaPending?: boolean;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = header.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;

        // The short-lived token issued after the password step of an MFA login
        // only proves the password. It must never work as a session token.
        if (decoded.mfaPending) {
            return res.status(401).json({ message: 'MFA verification required' });
        }

        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Not authorized, user no longer exists' });
        }

        req.user = user;
        next();
    } catch (error: any) {
        console.error('[protect]', error.message);
        res.status(401).json({ message: 'Not authorized' });
    }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};
