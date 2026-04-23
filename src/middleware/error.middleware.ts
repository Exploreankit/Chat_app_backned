import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global error handler — must be registered last in app.ts.
 * Catches anything forwarded via next(err).
 */
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Internal Server Error";

  console.error(`[Error] ${statusCode} — ${message}`);

  res.status(statusCode).json({
    message,
    ...(env.nodeEnv === "development" && { stack: err.stack }),
  });
};
