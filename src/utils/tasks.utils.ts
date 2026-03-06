/**
 * src/utils/tasks.utils.ts
 * ===========================
 * Background scheduled tasks.
 *
 * Currently handles:
 *   - Cart reservation cleanup: releases expired inventory reservations every 10 minutes
 *     so stock doesn't stay locked indefinitely if a user abandons checkout.
 *
 * Uses native setInterval (no external scheduler lib needed at this scale).
 * ===========================
 */

import { prisma } from '../config/database';
import { env } from '../config/env';

// How often to run the cleanup job (every 10 minutes)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Releases all expired cart reservations.
 *
 * For each expired reservation:
 *   1. Decrements inventory.reserved by reservation.quantity
 *   2. Increments inventory.stock by reservation.quantity
 *   3. Deletes the reservation record
 *
 * Wrapped in a Prisma transaction for atomicity.
 */
async function releaseExpiredReservations(): Promise<void> {
  const now = new Date();

  // Find all expired reservations
  const expired = await prisma.cartReservation.findMany({
    where: { expiresAt: { lt: now } },
    include: { inventory: true },
  });

  if (expired.length === 0) return;

  console.log(`[Tasks] Releasing ${expired.length} expired cart reservation(s)...`);

  // Process each expired reservation in its own transaction
  for (const reservation of expired) {
    await prisma.$transaction([
      // Return reserved units back to available stock
      prisma.inventory.update({
        where: { id: reservation.inventoryId },
        data: {
          reserved: { decrement: reservation.quantity },
          stock:    { increment: reservation.quantity },
        },
      }),
      // Delete the expired reservation record
      prisma.cartReservation.delete({
        where: { id: reservation.id },
      }),
    ]);
  }

  console.log(`[Tasks] Released ${expired.length} reservation(s) — stock restored.`);
}

/**
 * Starts all scheduled background tasks.
 * Called once at server startup (from index.ts).
 */
export function startScheduledTasks(): void {
  const intervalMinutes = env.CART_RESERVATION_MINUTES;
  console.log(`[Tasks] Cart cleanup scheduled every ${intervalMinutes} min`);

  // Run immediately on startup to clear any reservations left from a crash
  releaseExpiredReservations().catch((err) => {
    console.error('[Tasks] Initial cleanup failed:', err);
  });

  // Then run on interval
  setInterval(() => {
    releaseExpiredReservations().catch((err) => {
      console.error('[Tasks] Scheduled cleanup failed:', err);
    });
  }, CLEANUP_INTERVAL_MS);
}
