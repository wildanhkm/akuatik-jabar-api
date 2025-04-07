import { body, param, query } from 'express-validator';
import { InvoiceStatus } from '@prisma/client';

export const validateInvoiceCreate = [
  // Club ID validation
  param('clubId').isInt().withMessage('Club ID must be an integer'),

  // Basic invoice fields
  body('event_id').isInt().withMessage('Event ID must be an integer'),
  body('issue_date').isISO8601().withMessage('Issue date must be a valid date'),
  body('due_date').isISO8601().withMessage('Due date must be a valid date'),
  body('status')
    .optional()
    .isIn(Object.values(InvoiceStatus))
    .withMessage('Invalid invoice status'),
  body('reference_number')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Reference number must be a string (max 50 chars)'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string (max 500 chars)'),

  // Invoice items validation
  body('items').isArray({ min: 1 }).withMessage('At least one invoice item is required'),
  body('items.*.starting_list_id').isInt().withMessage('Starting list ID must be an integer'),
  body('items.*.member_id').isInt().withMessage('Member ID must be an integer'),
  body('items.*.description')
    .isString()
    .isLength({ min: 3, max: 255 })
    .withMessage('Description must be between 3-255 characters'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unit_price')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
];

export const validateInvoiceUpdate = [
  // Invoice ID validation
  param('id').isInt().withMessage('Invoice ID must be an integer'),

  // Updateable fields
  body('status')
    .optional()
    .isIn(Object.values(InvoiceStatus))
    .withMessage('Invalid invoice status'),
  body('payment_date').optional().isISO8601().withMessage('Payment date must be a valid date'),
  body('payment_method')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Payment method must be a string (max 50 chars)'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string (max 500 chars)'),
];

export const validateInvoiceQueryParams = [
  // Pagination and filtering
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('search')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search term must be a string (max 100 chars)'),
  query('status')
    .optional()
    .isIn(Object.values(InvoiceStatus))
    .withMessage('Invalid invoice status'),
];

export const validateInvoiceIdParam = [
  param('id').isInt().withMessage('Invoice ID must be an integer'),
];
