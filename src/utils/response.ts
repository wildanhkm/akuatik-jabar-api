import { Response } from 'express';

interface ResponseParams {
  res: Response;
  code?: number;
  message?: string;
  data?: any;
  paginatedData?: any[];
  page?: number;
  perPage?: number;
  total?: number;
}

export const apiResponse = ({
  res,
  code = 200,
  message = 'Your request is successful',
  data = null,
  paginatedData = [],
  page = 1,
  perPage = 10,
  total = 0,
}: ResponseParams) => {
  const response: any = {
    responseCode: code,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (paginatedData !== null) {
    response.paginatedData = paginatedData;
    response.page = page;
    response.perPage = perPage;
    response.total = total;
  }

  return res.status(code).json(response);
};

export const apiError = (res: Response, code: number, message: string, errors?: any) => {
  return res.status(code).json({
    responseCode: code,
    message,
    errors,
  });
};
