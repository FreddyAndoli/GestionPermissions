import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorMiddleware = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  if (err.name === 'ZodError') {
    const zodErr = err as any;
    res.status(400).json({
      error: 'Validation failed',
      details: zodErr.errors || zodErr.issues || []
    });
    return;
  }

  const status = (err as any).statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};
