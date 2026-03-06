/**
 * src/middlewares/auth.middleware.ts
 * ===========================
 * JWT authentication middleware.
 *
 * Usage: apply to any route that requires authentication.
 *   router.get('/protected', authenticate, controller.handler);
 *
 * Expects the Authorization header:
 *   Authorization: Bearer <token>
 *
 * On success: attaches decoded payload to req.user and calls next().
 * On failure: responds with 401 Unauthorized.
 * ===========================
 */

import { Response, NextFunction } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt.utils';
import { sendError } from '../utils/response.utils';
import { AuthRequest } from '../types';

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  // Header must exist and follow "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'Authorization token required');
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Attach payload to request
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      sendError(res, 401, 'Token expired. Please log in again.');
    } else if (err instanceof JsonWebTokenError) {
      sendError(res, 401, 'Invalid token.');
    } else {
      sendError(res, 401, 'Authentication failed.');
    }
  }
}
