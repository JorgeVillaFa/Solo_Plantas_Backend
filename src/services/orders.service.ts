/**
 * src/services/orders.service.ts
 * ===========================
 * Order management business logic.
 *
 * Handles:
 *   - Order history for authenticated user
 *   - Order detail
 *   - QR code activation (marks plant as activated)
 * ===========================
 */

import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { serializePrice } from '../utils/price.utils'

/**
 * Returns all orders for the authenticated user, newest first.
 */
export async function getUserOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      shippingType: true,
      totalAmountCents: true,
      shippingFeeCents: true,
      trackingNumber: true,
      createdAt: true,
      updatedAt: true,
      activatedAt: true,
      plant: {
        select: {
          id: true,
          name: true,
          scientificName: true,
          illustrationName: true,
          price: true,
          priceActive: true
        },
      },
      nursery: {
        select: { id: true, name: true, address: true },
      },
    },
  });

  // Serialize price on each order's plant
  return orders.map((o) => ({
    ...o,
    plant: o.plant
      ? {
        ...o.plant,
        price: serializePrice(o.plant.price, o.plant.priceActive),
        priceActive: undefined,
      }
      : null,
  }));
}

/**
 * Returns full detail for a single order.
 * Throws 403 if the order belongs to a different user.
 */
export async function getOrderById(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      plant: true,
      nursery: true,
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.userId !== userId) {
    throw new AppError('Forbidden', 403);
  }

  return {
    ...order,
    plant: order.plant
      ? {
        ...order.plant,
        price: serializePrice(order.plant.price, order.plant.priceActive),
        priceActive: undefined,
      }
      : null,
  };
}

/**
 * Activates an order via QR scan.
 * Sets activatedAt on both the Order and the UserPlant record.
 * Throws 409 if already activated.
 */
export async function activateOrder(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.userId !== userId) {
    throw new AppError('Forbidden', 403);
  }

  if (order.activatedAt) {
    throw new AppError('Order already activated', 409);
  }

  // Only confirmed/delivered orders can be activated
  if (!['confirmed', 'delivered'].includes(order.status)) {
    throw new AppError(
      'Order cannot be activated in its current status',
      400
    );
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { activatedAt: now, status: 'activated' },
    }),
    prisma.userPlant.update({
      where: { userId_plantId: { userId, plantId: order.plantId } },
      data: { activatedAt: now },
    }),
  ]);

  return { activated: true, orderId, activatedAt: now };
}
