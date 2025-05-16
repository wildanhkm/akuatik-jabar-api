import express from 'express';
import { uploadExcel } from '../controllers/fileUploadController';

const router = express.Router();
router.post('/upload-excel', uploadExcel);

export default router;
