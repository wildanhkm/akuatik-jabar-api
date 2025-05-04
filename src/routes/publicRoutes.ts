import express from 'express';
import {
  registerEvent,
  getRegistrationByNumber,
  getInvoice,
} from '../controllers/publicController';

const router = express.Router();

router.get('/detail/:registration_number', getRegistrationByNumber);
router.get('/detail/invoice/:invoice_number', getInvoice);
router.post('/register', registerEvent);

export default router;
