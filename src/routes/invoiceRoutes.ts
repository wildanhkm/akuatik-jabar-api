import express from 'express';
import {
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  getInvoicesByClubId,
  updateInvoice,
  getInvoiceItems,
} from '../controllers/invoiceController';
import {
  validateInvoiceCreate,
  validateInvoiceUpdate,
  validateInvoiceQueryParams,
  validateInvoiceIdParam,
} from '../validators/invoiceValidator';

const router = express.Router();

// Get all invoices for a club
router.get(
  '/clubs/:clubId/invoices',
  validateInvoiceIdParam, // validates clubId
  validateInvoiceQueryParams, // validates query params
  getInvoicesByClubId
);

// Create a new invoice for a club
router.post('/clubs/:clubId/invoices', validateInvoiceCreate, createInvoice);

// Get a specific invoice
router.get('/invoices/:id', validateInvoiceIdParam, getInvoiceById);

// Update an invoice
router.put('/invoices/:id', validateInvoiceIdParam, validateInvoiceUpdate, updateInvoice);

// Delete (soft delete) an invoice
router.delete('/invoices/:id', validateInvoiceIdParam, deleteInvoice);

// Get items for a specific invoice
router.get('/invoices/:id/items', validateInvoiceIdParam, getInvoiceItems);

export default router;
