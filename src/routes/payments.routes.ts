/**
 * src/routes/payments.routes.ts
 * ===========================
 * Stripe payment routes.
 *
 *   POST /intent    — Create PaymentIntent + pending Order (auth required)
 *   POST /webhook   — Stripe event webhook (public, raw body, no auth)
 * ===========================
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as paymentsController from '../controllers/payments.controller';

const router = Router();

// ---- POST /intent (protected) ----
router.post(
  '/intent',
  authenticate,
  [
    body('plantId').isUUID().withMessage('plantId must be a valid UUID'),
    body('shippingType')
      .isIn(['delivery', 'pickup'])
      .withMessage("shippingType must be 'delivery' or 'pickup'"),
    body('nurseryId')
      .optional()
      .isUUID()
      .withMessage('nurseryId must be a valid UUID'),
  ],
  validate,
  paymentsController.createIntent
);

// ---- POST /webhook (public — Stripe sends events here) ----
// Raw body is already applied in index.ts before this route is reached
router.post('/webhook', paymentsController.webhook);

export default router;
