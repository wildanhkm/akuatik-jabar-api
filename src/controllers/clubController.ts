import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { apiError, apiResponse } from '../utils/response';
// import { emailValidator, phoneValidator } from '../validators'; // Your custom validators

const prisma = new PrismaClient();

// Get all clubs with pagination
export const getClubs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const whereClause = {
      OR: [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ],
      deleted_at: null, // For soft delete
    };

    const [clubs, totalCount] = await Promise.all([
      prisma.club.findMany({
        where: whereClause,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        include: {
          user: true,
          _count: {
            select: { members: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.club.count({ where: whereClause }),
    ]);

    apiResponse({
      res,
      code: 200,
      paginatedData: clubs,
      total: totalCount,
      page: pageNumber,
      perPage: Number(limit),
    });
  } catch (error) {
    apiError(res, 500, 'Failed to fetch clubs');
  }
};

// Get single club by ID
export const getClubById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const club = await prisma.club.findFirst({
      where: {
        id: Number(id),
        deleted_at: null,
      },
      include: {
        user: true,
        members: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            role: true,
            category: true,
          },
        },
        event_registrations: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                start_date: true,
              },
            },
          },
        },
        invoices: {
          where: { status: { not: 'canceled' } },
          orderBy: { issue_date: 'desc' },
        },
      },
    });

    if (!club) {
      return apiError(res, 400, 'Club not found');
    }

    return apiResponse({ res, code: 200, data: club, message: 'Club fetched successfully' });
  } catch (error) {
    return apiError(res, 500, 'Failed to fetch club');
  }
};

// Update club by ID with validation
export const updateClubById = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, phone, email, address } = req.body;

  try {
    const existingClub = await prisma.club.findFirst({
      where: {
        id: { not: Number(id) },
        OR: [{ email }, { phone }],
        deleted_at: null,
      },
    });

    if (existingClub) {
      return apiError(res, 400, 'Email or phone already in use');
    }

    const updatedClub = await prisma.club.update({
      where: { id: Number(id) },
      data: {
        name,
        phone,
        email,
        address,
        updated_at: new Date(),
      },
    });

    return apiResponse({ res, code: 200, data: updatedClub, message: 'Club updated successfully' });
  } catch (error) {
    return apiError(res, 500, 'Failed to update club');
  }
};

// Soft delete club
export const deleteClub = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Verify club exists and not already deleted
    const club = await prisma.club.findFirst({
      where: {
        id: Number(id),
        deleted_at: null,
      },
    });

    if (!club) {
      return apiError(res, 404, 'Club not found or already deleted');
    }

    // Soft delete related records
    await prisma.$transaction([
      prisma.clubMember.updateMany({
        where: { id: Number(id) },
        data: { active: false },
      }),
      prisma.eventRegistration.updateMany({
        where: { id: Number(id) },
        data: { status: 'canceled' },
      }),
      prisma.invoice.updateMany({
        where: { id: Number(id) },
        data: { status: 'canceled' },
      }),
      prisma.club.update({
        where: { id: Number(id) },
        data: {
          deleted_at: new Date(),
          active: false,
        },
      }),
    ]);

    return apiResponse({ res, code: 204, message: 'Club updated successfully' });
  } catch (error) {
    return apiError(res, 500, 'Failed to delete club');
  }
};
