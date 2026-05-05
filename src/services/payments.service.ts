/**
 * src/services/payments.service.ts
 * ===========================
 * Stripe payments business logic.
 *
 * Card data NEVER touches this server — Stripe handles it (PCI-DSS L1).
 * This service only creates PaymentIntents and processes webhook confirmations.
 *
 * Flow:
 *   1. Client calls POST /payments/checkout-session → server creates Stripe Session URL
 *   2. Client opens URL in SafariViewController
 *   3. Stripe calls POST /payments/webhook → server confirms order + unlocks plant
 * ===========================
 */

import Stripe from 'stripe';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { ShippingType, ShippingAddress } from '../types';

// Lazy-initialize Stripe only when the key is configured
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError('Stripe is not configured', 503);
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }
  return _stripe;
}

const DELIVERY_FEE_CENTS = 9900; // $99 MXN

/**
 * Creates a Stripe Checkout Session for purchasing a plant.
 * Also creates a pending Order record.
 *
 * @param userId        Authenticated user
 * @param plantId       Plant to purchase
 * @param shippingType  'delivery' | 'pickup'
 * @param nurseryId     Required when shippingType === 'pickup'
 * @param address       Required when shippingType === 'delivery'
 */
export async function createCheckoutSession(
  userId: string,
  plantId: string,
  shippingType: ShippingType,
  nurseryId?: string,
  address?: ShippingAddress
) {
  const stripe = getStripe();

  // Fetch plant and validate it is purchasable
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, price: true, priceActive: true, name: true },
  });

  if (!plant) {
    throw new AppError('Plant not found', 404);
  }

  // Bug 3 fix: reject plants that have been price-disabled
  if (!plant.priceActive) {
    throw new AppError('This plant is not available for purchase', 409);
  }

  // Bug 2 fix: require an active cart reservation before accepting payment
  const inventory = await prisma.inventory.findUnique({ where: { plantId } });

  if (!inventory) {
    throw new AppError('Plant inventory not found', 404);
  }

  const activeReservation = await prisma.cartReservation.findFirst({
    where: {
      userId,
      inventoryId: inventory.id,
      expiresAt: { gt: new Date() },
    },
  });

  if (!activeReservation) {
    throw new AppError(
      'No active cart reservation found. Add the plant to your cart before checking out.',
      409
    );
  }

  const shippingFeeCents = shippingType === 'delivery' ? DELIVERY_FEE_CENTS : 0;
  const totalAmountCents = plant.price + shippingFeeCents;

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: `Solo Plantas — ${plant.name}`,
          },
          unit_amount: totalAmountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { userId, plantId },
    success_url: `https://solo-plantas-success.com`, // Dummy success URL since SafariView closes
    cancel_url: `https://solo-plantas-cancel.com`,
  });

  // Persist pending order
  const order = await prisma.order.create({
    data: {
      userId,
      plantId,
      status: 'pending',
      shippingType,
      totalAmountCents,
      shippingFeeCents,
      stripePaymentIntentId: session.id, // Reusing column for sessionId
      nurseryId: shippingType === 'pickup' ? nurseryId : null,
      shippingAddress:
        shippingType === 'delivery' && address
          ? JSON.stringify(address)
          : null,
    },
  });

  return {
    url: session.url,
    orderId: order.id,
    totalAmountCents,
  };
}

/**
 * Handles Stripe webhook events.
 * Verifies the webhook signature before processing.
 *
 * On checkout.session.completed:
 *   - Updates order status to 'confirmed'
 *   - Moves inventory from reserved → sold
 *   - Creates/updates UserPlant record with owned=true
 */
export async function handleWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw new AppError('Invalid webhook signature', 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await confirmPayment(session.id);
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    await cancelPayment(session.id);
  }
}

/**
 * Confirms a payment: updates order, moves inventory reserved→sold, unlocks plant.
 * Deletes the CartReservation so the scheduled cleanup job doesn't double-count.
 */
async function confirmPayment(stripePaymentIntentId: string): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId },
  });

  if (!order || order.status !== 'pending') return; // Idempotent

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: { plantId: order.plantId },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'confirmed', updatedAt: new Date() },
    });

    await tx.inventory.updateMany({
      where: { plantId: order.plantId },
      data: { reserved: { decrement: 1 }, sold: { increment: 1 } },
    });

    await tx.userPlant.upsert({
      where: { userId_plantId: { userId: order.userId, plantId: order.plantId } },
      create: {
        userId: order.userId,
        plantId: order.plantId,
        owned: true,
        purchasedAt: new Date(),
      },
      update: { owned: true, purchasedAt: new Date() },
    });

    // Bug 1 fix: remove reservation so the cleanup job doesn't decrement again
    if (inventory) {
      await tx.cartReservation.deleteMany({
        where: { userId: order.userId, inventoryId: inventory.id },
      });
    }
  });
}

/**
 * Cancels a failed payment: marks order cancelled, restores inventory reserved→stock.
 * Deletes the CartReservation so the scheduled cleanup job doesn't double-count.
 */
async function cancelPayment(stripePaymentIntentId: string): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId },
  });

  if (!order || order.status !== 'pending') return; // Idempotent

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where: { plantId: order.plantId },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'cancelled', updatedAt: new Date() },
    });

    await tx.inventory.updateMany({
      where: { plantId: order.plantId },
      data: { reserved: { decrement: 1 }, stock: { increment: 1 } },
    });

    // Bug 1 fix: remove reservation so the cleanup job doesn't decrement again
    if (inventory) {
      await tx.cartReservation.deleteMany({
        where: { userId: order.userId, inventoryId: inventory.id },
      });
    }
  });
}