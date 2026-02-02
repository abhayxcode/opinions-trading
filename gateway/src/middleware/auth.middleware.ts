import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { AuthContext } from '../interfaces/types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.auth = {
    userId: payload.userId,
    role: payload.role,
  };

  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.auth.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

export const requireSelfOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const targetUserId = req.params.userId || req.body.userId;

  if (req.auth.role === 'admin') {
    next();
    return;
  }

  if (req.auth.userId === targetUserId) {
    next();
    return;
  }

  res.status(403).json({ error: 'Access denied. You can only access your own resources.' });
};
