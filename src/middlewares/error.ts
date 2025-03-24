import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { apiError } from '../utils/response';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return apiError(res, 413, 'File too large. Max 5MB allowed');
    }
    return apiError(res, 400, err.message);
  }

  // Handle other errors
  console.error(err.stack);
  return apiError(res, 500, 'Internal Server Error');
};
