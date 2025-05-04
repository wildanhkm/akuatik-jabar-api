// src/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { apiError } from '../utils/response';

// Define the auth token interface
interface AuthToken {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthToken;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'akuatik-jabar-secret-key';

// Middleware to authenticate requests
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

  if (!token) {
    return apiError(res, 401, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    req.user = decoded;
    next();
  } catch (error) {
    return apiError(res, 403, 'Invalid or expired token.');
  }
};

/**
 * Helper function to create JWT token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
export const generateToken = (user: User) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};
