/**
 * src/routes/cart.routes.ts
 * ===========================
 * Cart reservation routes. All require authentication.
 *
 *   POST   /reserve        — Reserve inventory for a plant
 *   DELETE /reserve/:id    — Release a reservation
 * ===========================
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as cartController from '../controllers/cart.controller';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// ---- POST /reserve ----
router.post(
  '/reserve',
  [
    body('plantId').isUUID().withMessage('plantId must be a valid UUID'),
    body('quantity')
      .isInt({ min: 1, max: 10 })
      .withMessage('quantity must be between 1 and 10'),
  ],
  validate,
  cartController.reserve
);

// ---- DELETE /reserve/:id ----
router.delete('/reserve/:id', cartController.release);

export default router;
