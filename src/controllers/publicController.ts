import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { apiError, apiResponse } from '../utils/response';

const prisma = new PrismaClient();

export const registerEvent = async (req: Request, res: Response) => {
  // register event for kejurkab
  try {
    const { registrant_name, event_name, category, email, phone } = req.body;
    console.log('req.body :>> ', req.body);

    // Validate required fields
    if (!registrant_name) return apiError(res, 400, 'Name is required!');
    if (!event_name) return apiError(res, 400, 'Event name is required!');
    if (!category) return apiError(res, 400, 'Category is required!');
    if (!email) return apiError(res, 400, 'Email is required!');
    if (!phone) return apiError(res, 400, 'Phone number is required!');

    // Check if email or phone is already registered
    const existingRegistration = await prisma.publicKejurkab.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingRegistration) {
      return apiError(res, 400, 'Email or phone number already registered!');
    }

    // Create invoice first
    const invoice = await prisma.publicInvoice.create({
      data: {
        billed_to: registrant_name,
        status: 'pending',
      },
    });

    // Create registration with the generated invoice number
    // The registration_number will be auto-generated as UUID
    const registration = await prisma.publicKejurkab.create({
      data: {
        invoice_number: invoice.invoice_number,
        registrant_name,
        event_name,
        category,
        email,
        phone,
      },
      include: {
        invoice: true,
      },
    });

    return apiResponse({
      res,
      code: 201,
      message: 'Event registration successful!',
      data: {
        registration,
        invoice: {
          invoice_number: invoice.invoice_number,
          billed_to: invoice.billed_to,
          invoice_date: invoice.invoice_date,
          status: invoice.status,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return apiError(res, 500, 'Failed to register to event');
  }
};

// Get invoice by invoice number
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { invoice_number } = req.params;

    if (!invoice_number) {
      return apiError(res, 400, 'Invoice number is required!');
    }

    const invoice = await prisma.publicInvoice.findUnique({
      where: {
        invoice_number,
      },
      include: {
        kejurkab: true,
      },
    });

    if (!invoice) {
      return apiError(res, 404, 'Invoice not found!');
    }

    return apiResponse({ res, code: 200, message: 'Invoice found!', data: invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return apiError(res, 500, 'Failed to retrieve invoice');
  }
};

// Update invoice status
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { invoice_number } = req.params;
    const { status } = req.body;

    if (!invoice_number) {
      return apiError(res, 400, 'Invoice number is required!');
    }

    if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
      return apiError(res, 400, 'Valid status is required! (pending, paid, cancelled)');
    }

    const updatedInvoice = await prisma.publicInvoice.update({
      where: {
        invoice_number,
      },
      data: {
        status,
      },
    });

    return apiResponse({
      res,
      code: 200,
      message: 'Invoice status updated!',
      data: updatedInvoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return apiError(res, 500, 'Failed to update invoice status');
  }
};

// Get registration details by registration number
export const getRegistrationByNumber = async (req: Request, res: Response) => {
  try {
    const { registration_number } = req.params;

    if (!registration_number) {
      return apiError(res, 400, 'Registration number is required!');
    }

    const registration = await prisma.publicKejurkab.findUnique({
      where: {
        registration_number,
      },
      include: {
        invoice: true,
      },
    });

    if (!registration) {
      return apiError(res, 404, 'Registration not found!');
    }

    return apiResponse({ res, code: 200, message: 'Registration found!', data: registration });
  } catch (error) {
    console.error('Get registration error:', error);
    return apiError(res, 500, 'Failed to retrieve registration');
  }
};
