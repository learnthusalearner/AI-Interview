import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../config/logger';

export const validate = (schema: ZodSchema) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn(`Validation Error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.issues,
      });
      return;
    }
    next(error);
  }
};
