import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import { excelUpload } from '../utils/multer';
import fs from 'fs';
import path from 'path';
import { apiError, apiResponse } from '../utils/response';

type ExcelUser = {
  email: string;
  username: string;
  password?: string;
  role?: 'club' | 'official' | 'admin';
  is_active?: boolean;
};

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Create a new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, role, password } = req.body;

    // Validate input
    if (!username || !email || !password || role === undefined) {
      return apiError(res, 400, 'Name, email, password, and role are required!');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        role,
        password: hashedPassword,
      },
    });

    return apiResponse({
      res,
      code: 201,
      message: 'User created successfully',
      data: user,
    });
  } catch (error: unknown) {
    console.error(error as string);

    // Handle unique constraint violation
    // if (error.code === 'P2002') {
    //   return apiError(res, 409, 'Email already exists');
    // }

    return apiError(res, 500, 'Failed to create user');
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 10;
    const skip = (page - 1) * perPage;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: perPage,
      }),
      prisma.user.count(),
    ]);

    return apiResponse({
      res,
      paginatedData: users,
      page,
      perPage,
      total,
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    console.error(error as string);

    return apiError(res, 500, 'Failed to fetch users');
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return apiError(res, 404, 'User not found');
    }

    return apiResponse({
      res,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    console.error(error as string);

    return apiError(res, 500, 'Failed to fetch user');
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;

    // Validate input
    if (!username || !email || role === undefined) {
      return apiError(res, 400, 'Name, email, and role are required');
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        username,
        email,
        role,
      },
    });

    return apiResponse({
      res,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error(error as string);

    // Handle not found error
    // if (error.code === 'P2025') {
    //   return apiError(res, 404, 'User not found');
    // }

    // Handle unique constraint violation
    // if (error.code === 'P2002') {
    //   return apiError(res, 409, 'Email already exists');
    // }

    return apiError(res, 500, 'Failed to update user');
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    return apiResponse({
      res,
      code: 204,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error(error as string);

    // Handle not found error
    // if (error.code === 'P2025') {
    //   return apiError(res, 404, 'User not found');
    // }

    return apiError(res, 500, 'Failed to delete user');
  }
};

export const bulkImportUsers = [
  excelUpload, // Multer middleware first
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return apiError(res, 400, 'No file uploaded');
      }

      // Verify file exists
      if (!fs.existsSync(req.file.path)) {
        return apiError(res, 400, 'File upload failed');
      }

      // Read the Excel file
      const workbook = xlsx.readFile(req.file.path);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const usersData: ExcelUser[] = xlsx.utils.sheet_to_json(worksheet);
      const usersDataWithPassword = usersData.map(async (user) => {
        if (!user.password) {
          return apiError(res, 400, 'Row(s) detected without password!');
        }

        return await prisma.user.create({
          data: {
            username: user.username,
            email: user.email,
            role: user.role,
            password: await bcrypt.hash(user.password, SALT_ROUNDS),
          },
        });
      });

      // Delete the temp file after reading
      fs.unlinkSync(req.file.path);

      if (!usersData || usersData.length === 0) {
        return apiError(res, 400, 'No data found in the Excel file');
      }

      return apiResponse({
        res,
        code: 201,
        message: 'All user created successfully',
        data: usersDataWithPassword,
      });
      // ... rest of your bulk import logic
    } catch (error: unknown) {
      // Clean up file if error occurs
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error(error as string);

      return handleUserError(error, res);
    }
  },
];

function generateRandomPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function handleUserError(error: unknown, res: Response) {
  if (error instanceof Error) {
    return apiError(res, 400, error.message);
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = error as { code: string; meta?: any };

    switch (prismaError.code) {
      case 'P2002':
        const target = prismaError.meta?.target as string[];
        const field = target?.[0] || 'field';
        return apiError(res, 409, `${field} already exists`);
      case 'P2025':
        return apiError(res, 404, 'User not found');
      default:
        return apiError(res, 500, 'Database error occurred');
    }
  }

  return apiError(res, 500, 'An unexpected error occurred');
}
