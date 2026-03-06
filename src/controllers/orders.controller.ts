/**
 * src/controllers/orders.controller.ts
 * ===========================
 * Order management route handlers.
 *
 * Routes:
 *   GET  /api/v1/orders          — Order history
 *   GET  /api/v1/orders/:id      — Order detail
 *   POST /api/v1/orders/:id/activate — QR scan activation
 * ===========================
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response.utils';
import * as ordersService from '../services/orders.service';

/**
 * GET /api/v1/orders
 * Returns the authenticated user's order history.
 */
export async function listOrders(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const orders = await ordersService.getUserOrders(userId);
    sendSuccess(res, orders);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/orders/:id
 * Returns detail for a specific order.
 */
export async function getOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const order = await ordersService.getOrderById(req.params.id, userId);
    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/orders/:id/activate
 * Activates an order via QR scan.
 */
export async function activateOrder(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await ordersService.activateOrder(req.params.id, userId);
    sendSuccess(res, result, 'Order activated');
  } catch (err) {
    next(err);
  }
}
