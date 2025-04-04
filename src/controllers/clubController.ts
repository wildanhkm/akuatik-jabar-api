import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
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

    res.status(200).json({
      data: clubs,
      meta: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clubs' });
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
      return res.status(404).json({ error: 'Club not found' });
    }

    res.status(200).json(club);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch club' });
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
      return res.status(400).json({ error: 'Email or phone already in use' });
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

    res.status(200).json(updatedClub);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update club' });
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
      return res.status(404).json({ error: 'Club not found or already deleted' });
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

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete club' });
  }
};
