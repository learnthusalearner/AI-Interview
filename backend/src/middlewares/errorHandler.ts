import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${statusCode}, Message:: ${err.message}`);
  if (env.NODE_ENV === 'development' && ! (err instanceof AppError)) {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
