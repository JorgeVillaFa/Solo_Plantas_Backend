/**
 * src/routes/payments.routes.ts
 * ===========================
 * Stripe payment routes.
 *
 *   POST /checkout-session — Create Checkout Session + pending Order (auth required)
 *   POST /webhook   — Stripe event webhook (public, raw body, no auth)
 * ===========================
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as paymentsController from '../controllers/payments.controller';

const router = Router();

// ---- POST /checkout-session (protected) ----
router.post(
  '/checkout-session',
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
  paymentsController.createCheckoutSession
);

// ---- POST /webhook (public — Stripe sends events here) ----
// Raw body is already applied in index.ts before this route is reached
router.post('/webhook', paymentsController.webhook);

export default router;
