import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { apiError, apiResponse } from '../utils/response';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

type RegisterBody = {
  email: string;
  username: string;
  password: string;
  role?: 'club' | 'official' | 'admin';
};

type LoginBody = {
  emailOrUsername: string;
  password: string;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, role = 'club' }: RegisterBody = req.body;

    // Validate input
    if (!email || !username || !password) {
      return apiError(res, 400, 'All fields are required');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return apiError(res, 400, 'Email or username already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role,
      },
    });

    // Create corresponding club or official profile if needed
    if (role === 'club') {
      await prisma.club.create({
        data: {
          user_id: user.id,
          name: username, // Using username as default club name
        },
      });
    } else if (role === 'official') {
      await prisma.official.create({
        data: {
          user_id: user.id,
          name: username, // Using username as default official name
        },
      });
    }

    // Return user data (excluding password) and token
    const { password: _, ...userData } = user;
    return apiResponse({
      res,
      data: { user: userData },
      code: 200,
      message: 'User successfully registered!',
    });
  } catch (error) {
    return apiError(res, 500, 'Internal server error', error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password }: LoginBody = req.body;

    // Validate input
    if (!emailOrUsername || !password) {
      return apiError(res, 400, 'Email/username and password are required!');
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      return apiError(res, 401, 'Account is not found!');
    }

    // Check if user is active
    if (!user.is_active) {
      return apiError(res, 403, 'Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return apiError(res, 401, 'Password is invalid!');
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Return user data (excluding password) and token
    const { password: _, ...userData } = user;
    return apiResponse({
      res,
      data: { user: userData, token },
    });
  } catch (error) {
    return apiError(res, 500, 'Internal server error', error);
  }
};
