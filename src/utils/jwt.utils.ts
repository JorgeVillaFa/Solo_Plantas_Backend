/**
 * src/utils/jwt.utils.ts
 * ===========================
 * JWT helper functions for signing and verifying tokens.
 *
 * The server is stateless — tokens are not stored server-side.
 * Logout is handled client-side by discarding the token.
 * ===========================
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

/**
 * Signs a new JWT access token for a user.
 * @param userId  UUID of the user
 * @param email   Email of the user
 * @returns Signed JWT string
 */
export function signToken(userId: string, email: string): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = { userId, email };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verifies and decodes a JWT token.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 * @param token  Raw JWT string (without "Bearer " prefix)
 * @returns Decoded payload
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
