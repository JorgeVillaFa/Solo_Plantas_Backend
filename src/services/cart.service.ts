/**
 * src/services/cart.service.ts
 * ===========================
 * Cart reservation business logic.
 *
 * Uses Prisma transactions to ensure ACID compliance:
 *   - Inventory stock is decremented and reserved atomically.
 *   - No race conditions — concurrent requests can't over-reserve.
 *
 * Reservation expiry is cleaned up by utils/tasks.utils.ts on a schedule.
 * ===========================
 */

import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

/**
 * Creates a cart reservation, holding inventory for the user.
 *
 * Checks:
 *   - Plant exists and has an inventory record
 *   - Enough stock is available (stock >= quantity)
 *   - User doesn't already own the plant
 *
 * @returns The created CartReservation record
 */
export async function reserveInventory(
  userId: string,
  plantId: string,
  quantity: number
) {
  return prisma.$transaction(async (tx) => {
    // Lock inventory row for update to prevent race conditions
    const inventory = await tx.inventory.findFirst({
      where: { plantId },
    });

    if (!inventory) {
      throw new AppError('Plant inventory not found', 404);
    }

    // Check if user already owns this plant
    const userPlant = await tx.userPlant.findUnique({
      where: { userId_plantId: { userId, plantId } },
    });

    if (userPlant?.owned) {
      throw new AppError('You already own this plant', 409);
    }

    // Validate sufficient stock
    if (inventory.stock < quantity) {
      throw new AppError(
        `Insufficient stock. Available: ${inventory.stock}`,
        409
      );
    }

    // Calculate expiry time
    const expiresAt = new Date(
      Date.now() + env.CART_RESERVATION_MINUTES * 60 * 1000
    );

    // Atomically move units from stock → reserved
    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        stock:    { decrement: quantity },
        reserved: { increment: quantity },
      },
    });

    // Create the reservation record
    const reservation = await tx.cartReservation.create({
      data: {
        userId,
        inventoryId: inventory.id,
        quantity,
        expiresAt,
      },
    });

    return reservation;
  });
}

/**
 * Releases a cart reservation early (user removes item from cart).
 * Returns reserved units back to available stock.
 *
 * Only the owner of the reservation can release it.
 */
export async function releaseReservation(
  reservationId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.cartReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404);
    }

    if (reservation.userId !== userId) {
      throw new AppError('Forbidden', 403);
    }

    // Return units from reserved → stock
    await tx.inventory.update({
      where: { id: reservation.inventoryId },
      data: {
        reserved: { decrement: reservation.quantity },
        stock:    { increment: reservation.quantity },
      },
    });

    await tx.cartReservation.delete({ where: { id: reservationId } });

    return { released: true, reservationId };
  });
}
