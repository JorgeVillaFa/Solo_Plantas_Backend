/**
 * src/controllers/payments.controller.ts
 * ===========================
 * Stripe payments route handlers.
 *
 * Routes:
 *   POST /api/v1/payments/intent    — Create PaymentIntent (auth required)
 *   POST /api/v1/payments/confirm   — Manual confirm (optional, for testing)
 *   POST /api/v1/payments/webhook   — Stripe webhook (no auth, raw body)
 * ===========================
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendCreated, sendSuccess, sendError } from '../utils/response.utils';
import * as paymentsService from '../services/payments.service';

/**
 * POST /api/v1/payments/intent
 * Creates a Stripe PaymentIntent and a pending Order.
 * Body: { plantId, shippingType, nurseryId?, address? }
 */
export async function createIntent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { plantId, shippingType, nurseryId, address } = req.body;

    const result = await paymentsService.createPaymentIntent(
      userId,
      plantId,
      shippingType,
      nurseryId,
      address
    );

    sendCreated(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/payments/webhook
 * Stripe sends events here after payment succeeds/fails.
 * NOTE: Raw body is required — mounted before express.json() in index.ts.
 * No authentication — Stripe signature is verified inside the service.
 */
export async function webhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      sendError(res, 400, 'Missing stripe-signature header');
      return;
    }

    await paymentsService.handleWebhook(req.body as Buffer, signature);

    // Stripe requires a 200 response quickly — process async
    sendSuccess(res, { received: true });
  } catch (err) {
    next(err);
  }
}
