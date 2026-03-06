/**
 * src/middlewares/error.middleware.ts
 * ===========================
 * Global error handler middleware.
 *
 * Must be registered LAST in the Express middleware chain (index.ts does this).
 * Catches all errors passed via next(err) from any route or middleware.
 *
 * Prisma-specific errors are translated to meaningful HTTP responses.
 * In production, internal error details are hidden from clients.
 * ===========================
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// Custom application error with an HTTP status code
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Express error-handling middleware (4-argument signature required).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === 'development';

  // ---- Known application errors ----
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(isDev && err.details ? { details: err.details } : {}),
    });
    return;
  }

  // ---- Prisma Client Known Request Errors ----
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[]) ?? [];
      res.status(409).json({
        success: false,
        error: `Duplicate value for: ${fields.join(', ')}`,
      });
      return;
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found',
      });
      return;
    }

    // Other Prisma errors
    res.status(400).json({
      success: false,
      error: 'Database error',
      ...(isDev ? { details: err.message } : {}),
    });
    return;
  }

  // ---- Prisma Validation Errors ----
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Invalid data provided',
      ...(isDev ? { details: err.message } : {}),
    });
    return;
  }

  // ---- Unknown / Unhandled Errors ----
  console.error('[GlobalErrorHandler] Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isDev && err instanceof Error ? { details: err.message } : {}),
  });
}
