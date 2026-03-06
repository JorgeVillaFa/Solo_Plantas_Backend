/**
 * src/services/payments.service.ts
 * ===========================
 * Stripe payments business logic.
 *
 * Card data NEVER touches this server — Stripe handles it (PCI-DSS L1).
 * This service only creates PaymentIntents and processes webhook confirmations.
 *
 * Flow:
 *   1. Client calls POST /payments/intent → server creates Stripe PaymentIntent
 *   2. Client uses clientSecret to complete payment on-device
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
 * Creates a Stripe PaymentIntent for purchasing a plant.
 * Also creates a pending Order record.
 *
 * @param userId        Authenticated user
 * @param plantId       Plant to purchase
 * @param shippingType  'delivery' | 'pickup'
 * @param nurseryId     Required when shippingType === 'pickup'
 * @param address       Required when shippingType === 'delivery'
 */
export async function createPaymentIntent(
  userId: string,
  plantId: string,
  shippingType: ShippingType,
  nurseryId?: string,
  address?: ShippingAddress
) {
  const stripe = getStripe();

  // Fetch plant price
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, priceInCents: true, commonName: true },
  });

  if (!plant) {
    throw new AppError('Plant not found', 404);
  }

  const shippingFeeCents = shippingType === 'delivery' ? DELIVERY_FEE_CENTS : 0;
  const totalAmountCents = plant.priceInCents + shippingFeeCents;

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmountCents,
    currency: 'mxn',
    metadata: { userId, plantId },
    description: `Solo Plantas — ${plant.commonName}`,
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
      stripePaymentIntentId: paymentIntent.id,
      nurseryId: shippingType === 'pickup' ? nurseryId : null,
      shippingAddress:
        shippingType === 'delivery' && address
          ? JSON.stringify(address)
          : null,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    orderId: order.id,
    totalAmountCents,
  };
}

/**
 * Handles Stripe webhook events.
 * Verifies the webhook signature before processing.
 *
 * On payment_intent.succeeded:
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

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await confirmPayment(intent.id);
  }

  // Other event types (payment_intent.payment_failed, etc.) can be handled here
}

/**
 * Confirms a payment: updates order, moves inventory, unlocks plant for user.
 */
async function confirmPayment(stripePaymentIntentId: string): Promise<void> {
  const order = await prisma.order.findFirst({
    where: { stripePaymentIntentId },
  });

  if (!order || order.status !== 'pending') return; // Idempotent

  await prisma.$transaction([
    // Update order to confirmed
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'confirmed', updatedAt: new Date() },
    }),

    // Move inventory from reserved → sold
    prisma.inventory.updateMany({
      where: { plantId: order.plantId },
      data: {
        reserved: { decrement: 1 },
        sold:     { increment: 1 },
      },
    }),

    // Unlock the plant for the user (upsert handles re-purchases)
    prisma.userPlant.upsert({
      where: { userId_plantId: { userId: order.userId, plantId: order.plantId } },
      create: {
        userId: order.userId,
        plantId: order.plantId,
        owned: true,
        purchasedAt: new Date(),
      },
      update: {
        owned: true,
        purchasedAt: new Date(),
      },
    }),
  ]);
}
