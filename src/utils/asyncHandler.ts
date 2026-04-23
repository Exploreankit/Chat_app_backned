import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so unhandled promise rejections are forwarded
 * to Express's error middleware instead of crashing the process.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
