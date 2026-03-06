/**
 * src/utils/response.utils.ts
 * ===========================
 * Helper functions for sending standardized API responses.
 * Keeps controllers clean and ensures consistent response shape.
 * ===========================
 */

import { Response } from 'express';
import { ApiSuccess, ApiError } from '../types';

/**
 * Send a 200 OK success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void {
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

/**
 * Send a 201 Created success response.
 */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201);
}

/**
 * Send an error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  details?: unknown
): void {
  const body: ApiError = { success: false, error };
  if (details !== undefined) body.details = details;
  res.status(statusCode).json(body);
}
