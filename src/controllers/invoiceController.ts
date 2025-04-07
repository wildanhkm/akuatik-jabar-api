import { Request, Response } from 'express';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import { validationResult } from 'express-validator';
import { apiError, apiResponse } from '../utils/response';

const prisma = new PrismaClient();

export const getInvoicesByClubId = async (req: Request, res: Response) => {
  try {
    const { clubId, page = 1, limit = 10, search = '', status } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const whereClause: any = {
      club_id: Number(clubId),
      deleted_at: null,
      OR: [
        { reference_number: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ],
    };

    if (status) {
      whereClause.status = status as InvoiceStatus;
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              name: true,
            },
          },
          items: {
            select: {
              id: true,
              total_price: true,
            },
          },
        },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { created_at: 'desc' },
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    // Calculate total amount from items if needed
    const invoicesWithTotals = invoices.map((invoice) => ({
      ...invoice,
      total_amount: invoice.items.reduce((sum, item) => sum + item.total_price, 0),
      item_count: invoice.items.length,
    }));

    return apiResponse({
      res,
      code: 200,
      data: invoicesWithTotals,
      total: totalCount,
      page: pageNumber,
      perPage: limitNumber,
    });
  } catch (error) {
    console.error(error);
    return apiError(res, 500, 'Failed to fetch invoices');
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: Number(id),
        deleted_at: null,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            start_date: true,
            end_date: true,
          },
        },
        items: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            starting_list: {
              select: {
                id: true,
                category: true,
                gender: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return apiError(res, 404, 'Invoice not found');
    }

    return apiResponse({
      res,
      code: 200,
      data: invoice,
    });
  } catch (error) {
    console.error(error);
    return apiError(res, 500, 'Failed to fetch invoice');
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiError(res, 400, 'Validation errors', errors.array());
  }

  try {
    const { club_id, event_id, issue_date, due_date, status, items } = req.body;

    // Calculate total amount from items
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unit_price,
      0
    );

    const invoice = await prisma.invoice.create({
      data: {
        club_id,
        event_id,
        amount: totalAmount,
        issue_date: new Date(issue_date),
        due_date: new Date(due_date),
        status: status || InvoiceStatus.draft,
        items: {
          create: items.map((item: any) => ({
            starting_list_id: item.starting_list_id,
            member_id: item.member_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return apiResponse({
      res,
      code: 201,
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    console.error(error);
    return apiError(res, 500, 'Failed to create invoice');
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiError(res, 400, 'Validation errors', errors.array());
  }

  try {
    const { id } = req.params;
    const { status, payment_date, payment_method, notes } = req.body;

    const updatedInvoice = await prisma.invoice.update({
      where: {
        id: Number(id),
        deleted_at: null,
      },
      data: {
        status,
        payment_date: payment_date ? new Date(payment_date) : undefined,
        payment_method,
        notes,
      },
    });

    return apiResponse({
      res,
      code: 200,
      data: updatedInvoice,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error(error);
    return apiError(res, 500, 'Failed to update invoice');
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete the invoice
    await prisma.invoice.update({
      where: {
        id: Number(id),
      },
      data: {
        deleted_at: new Date(),
        status: InvoiceStatus.canceled,
      },
    });

    return apiResponse({
      res,
      code: 200,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error(error);
    return apiError(res, 500, 'Failed to delete invoice');
  }
};

export const getInvoiceItems = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const [items, totalCount] = await Promise.all([
      prisma.invoiceItem.findMany({
        where: {
          invoice_id: Number(id),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          starting_list: {
            select: {
              id: true,
              category: true,
            },
          },
        },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      prisma.invoiceItem.count({
        where: {
          invoice_id: Number(id),
        },
      }),
    ]);

    return apiResponse({
      res,
      code: 200,
      data: items,
      total: totalCount,
      page: pageNumber,
      perPage: limitNumber,
    });
  } catch (error) {
    console.error(error);
    return apiError(res, 500, 'Failed to fetch invoice items');
  }
};
