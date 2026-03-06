/**
 * src/routes/auth.routes.ts
 * ===========================
 * Authentication routes.
 *
 * Public:
 *   POST /register  — Create account
 *   POST /login     — Login, receive JWT
 *
 * Protected (requires valid JWT):
 *   POST /logout    — Acknowledge logout (client discards token)
 *   GET  /me        — Current user profile
 * ===========================
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// ---- POST /register ----
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.register
);

// ---- POST /login ----
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// ---- POST /logout (protected) ----
router.post('/logout', authenticate, authController.logout);

// ---- GET /me (protected) ----
router.get('/me', authenticate, authController.me);

export default router;
