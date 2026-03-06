/**
 * src/controllers/auth.controller.ts
 * ===========================
 * Authentication route handlers.
 *
 * Routes:
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/logout
 *   GET  /api/v1/auth/me
 * ===========================
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess, sendCreated } from '../utils/response.utils';
import * as authService from '../services/auth.service';

/**
 * POST /api/v1/auth/register
 * Creates a new user account and returns a JWT.
 */
export async function register(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.registerUser({ email, password });
    sendCreated(res, result, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 * Authenticates a user and returns a JWT.
 */
export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.loginUser({ email, password });
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * Stateless logout — server just acknowledges.
 * The client is responsible for discarding the JWT (stored in iOS Keychain).
 */
export function logout(_req: AuthRequest, res: Response): void {
  sendSuccess(res, null, 'Logged out successfully');
}

/**
 * GET /api/v1/auth/me
 * Returns the current authenticated user's profile.
 * Requires: authenticate middleware (req.user populated).
 */
export async function me(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await authService.getCurrentUser(userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
