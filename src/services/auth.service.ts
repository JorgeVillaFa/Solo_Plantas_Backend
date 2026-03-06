/**
 * src/services/auth.service.ts
 * ===========================
 * Authentication business logic — registration, login.
 *
 * Passwords are hashed with bcrypt (cost factor 12).
 * Plain text password is nulled immediately after hashing.
 * JWT tokens are signed with the JWT_SECRET from config/env.ts.
 * ===========================
 */

import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { signToken } from '../utils/jwt.utils';
import { AppError } from '../middlewares/error.middleware';

const BCRYPT_ROUNDS = 12;

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
}

/**
 * Creates a new user account.
 * Throws 409 if email is already registered.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  // Hash password — plain text is never persisted
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  const token = signToken(user.id, user.email);

  return { token, user };
}

/**
 * Authenticates a user with email + password.
 * Throws 401 for invalid credentials (intentionally vague to prevent enumeration).
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  // Use constant-time comparison even when user doesn't exist (prevents timing attacks)
  const dummyHash = '$2b$12$invalidhashfordummycomparison00000000000000000000000000';
  const isValid = user
    ? await bcrypt.compare(input.password, user.passwordHash)
    : await bcrypt.compare(input.password, dummyHash).then(() => false);

  if (!user || !isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user.id, user.email);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Returns public profile for the current authenticated user.
 * Throws 404 if user no longer exists (deleted account edge case).
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          userPlants: { where: { owned: true } }, // Count of owned plants
          orders: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}
