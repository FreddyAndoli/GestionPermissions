import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler so that rejected promises
 * are forwarded to the global error middleware.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Safely parses an integer route/query parameter.
 * Throws a 400-style error if the value is not a valid integer.
 */
export const parseId = (value: string, field = 'id'): number => {
  const id = parseInt(value, 10);
  if (Number.isNaN(id)) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return id;
};
