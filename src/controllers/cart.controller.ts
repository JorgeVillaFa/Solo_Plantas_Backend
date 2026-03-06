/**
 * src/controllers/cart.controller.ts
 * ===========================
 * Cart reservation route handlers.
 *
 * Routes:
 *   POST   /api/v1/cart/reserve
 *   DELETE /api/v1/cart/reserve/:id
 * ===========================
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendCreated, sendSuccess } from '../utils/response.utils';
import * as cartService from '../services/cart.service';

/**
 * POST /api/v1/cart/reserve
 * Reserves inventory for a plant (ACID transaction).
 * Body: { plantId: string, quantity: number }
 */
export async function reserve(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { plantId, quantity } = req.body as {
      plantId: string;
      quantity: number;
    };

    const reservation = await cartService.reserveInventory(
      userId,
      plantId,
      quantity
    );

    sendCreated(res, reservation, 'Inventory reserved');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/cart/reserve/:id
 * Releases a cart reservation early (user removes item from cart).
 */
export async function release(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await cartService.releaseReservation(req.params.id, userId);
    sendSuccess(res, result, 'Reservation released');
  } catch (err) {
    next(err);
  }
}
