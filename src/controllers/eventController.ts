import { Request, Response } from 'express';
import { apiError, apiResponse } from '../utils/response';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const eventSchema = z
  .object({
    name: z.string().min(1, 'Event name is required'),
    description: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().datetime({ message: 'Invalid ISO date format' }),
    endDate: z.string().datetime({ message: 'Invalid ISO date format' }),
    registrationDeadline: z.string().datetime({ message: 'Invalid ISO date format' }).optional(),
    status: z.enum(['draft', 'open', 'in_progress', 'completed', 'canceled']).optional(),
    maxParticipants: z.number().int().positive().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      if (!data.registrationDeadline) return true;
      return new Date(data.registrationDeadline) < new Date(data.startDate);
    },
    {
      message: 'registrationDeadline must be before startDate',
      path: ['registrationDeadline'],
    }
  );

// Infer TypeScript type from Zod schema
type EventBody = z.infer<typeof eventSchema>;

export const createEvent = async (req: Request, res: Response) => {
  try {
    if (req.body === undefined) {
      return apiError(res, 400, 'No data to create');
    }

    // Validate and parse the request body
    const result = eventSchema.safeParse(req.body);

    if (!result.success) {
      // Format Zod errors for better client response
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return apiError(res, 400, 'Validation failed', errors);
    }

    // result.data is now properly typed as EventBody
    const createdEvent = await prisma.event.create({
      data: { ...result.data, start_date: result.data.startDate, end_date: result.data.endDate },
    });

    return apiResponse({
      res,
      code: 201,
      data: createdEvent,
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error(error as string);
    return apiError(res, 500, 'Failed to create event', error);
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 10;
    const skip = (page - 1) * perPage;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        skip,
        take: perPage,
      }),
      prisma.event.count(),
    ]);

    return apiResponse({
      res,
      paginatedData: events,
      page,
      perPage,
      total,
      message: 'Events retrieved successfully',
    });
  } catch (error) {
    console.error(error as string);
    return apiError(res, 500, 'Failed to fetch events');
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
    });

    if (!event) {
      return apiError(res, 404, 'Event not found');
    }

    return apiResponse({
      res,
      data: event,
      message: 'Event retrieved successfully',
    });
  } catch (error) {
    console.error(error as string);
    return apiError(res, 500, 'Failed to fetch event');
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.body === undefined) {
      return apiError(res, 400, 'No data to update');
    }

    // Validate and parse the request body
    const result = eventSchema.safeParse(req.body);

    if (!result.success) {
      // Format Zod errors for better client response
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return apiError(res, 400, 'Validation failed', errors);
    }

    // result.data is now properly typed as EventBody
    const updatedEvent = await prisma.event.update({
      where: { id: Number(id) },
      data: result.data,
    });

    return apiResponse({
      res,
      code: 201,
      data: updatedEvent,
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error(error as string);
    return apiError(res, 500, 'Failed to update event');
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.event.delete({
      where: { id: Number(id) },
    });

    return apiResponse({
      res,
      code: 204,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error(error as string);
    return apiError(res, 500, 'Failed to delete event');
  }
};
