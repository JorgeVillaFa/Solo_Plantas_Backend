/**
 * src/services/payments.service.test.ts
 * =====================================
 * Unit tests for payments.service.ts
 *
 * Mocks:
 *   - prisma
 *   - stripe
 *   - env
 */

import Stripe from 'stripe';
import { createCheckoutSession, handleWebhook } from '../services/payments.service';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
    prisma: {
        plant: { findUnique: jest.fn() },
        inventory: { findUnique: jest.fn() },
        cartReservation: { findFirst: jest.fn() },
        order: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
        $transaction: jest.fn(),
    },
}));

jest.mock('../config/env', () => ({
    env: {
        STRIPE_SECRET_KEY: 'sk_test_fake',
        STRIPE_WEBHOOK_SECRET: 'whsec_fake',
    },
}));

// Mock the Stripe constructor and the methods we care about
const mockSessionsCreate = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: { sessions: { create: mockSessionsCreate } },
        webhooks: { constructEvent: mockConstructEvent },
    }));
});

// ── Types ──────────────────────────────────────────────────────────────────

interface MockTx {
    order: { update: jest.Mock };
    inventory: { findUnique: jest.Mock; updateMany: jest.Mock };
    userPlant: { upsert: jest.Mock };
    cartReservation: { deleteMany: jest.Mock };
}

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

function makeTx(): MockTx {
    return {
        order: { update: jest.fn() },
        inventory: { findUnique: jest.fn(), updateMany: jest.fn() },
        userPlant: { upsert: jest.fn() },
        cartReservation: { deleteMany: jest.fn() },
    };
}

function mockTransaction(tx: MockTx) {
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: MockTx) => Promise<unknown>) => cb(tx)
    );
}

function makeStripeEvent(
    type: string,
    intentId: string
): Stripe.Event {
    return {
        type,
        data: {
            object: { id: intentId } as Stripe.Checkout.Session,
        },
    } as Stripe.Event;
}

// ── Shared fixtures ────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000000';
const PLANT_ID = '00000000-0000-0000-0000-000000000001';
const INVENTORY_ID = '00000000-0000-0000-0000-000000000002';
const ORDER_ID = '00000000-0000-0000-0000-000000000003';
const RESERVATION_ID = '00000000-0000-0000-0000-000000000004';
const SESSION_ID = 'cs_123';
const SESSION_URL = 'https://stripe.com/checkout/cs_123';


const basePlant = {
    id: PLANT_ID,
    name: 'Rosa',
    price: 17442,
    priceActive: true,
};

const baseInventory = {
    id: INVENTORY_ID,
    plantId: PLANT_ID,
    stock: 5,
    reserved: 1,
};

const baseReservation = {
    id: RESERVATION_ID,
    userId: USER_ID,
    inventoryId: INVENTORY_ID,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
};

const baseOrder = {
    id: ORDER_ID,
    userId: USER_ID,
    plantId: PLANT_ID,
    status: 'pending',
    stripePaymentIntentId: SESSION_ID,
};

// ── createCheckoutSession ────────────────────────────────────────────────────

describe('createCheckoutSession', () => {
    beforeEach(() => {
        mockSessionsCreate.mockResolvedValue({
            id: SESSION_ID,
            url: SESSION_URL,
        });
        (mockedPrisma.order.create as jest.Mock).mockResolvedValue({
            id: ORDER_ID,
        });
    });

    describe('happy path — pickup', () => {
        beforeEach(() => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);
            (mockedPrisma.inventory.findUnique as jest.Mock).mockResolvedValue(baseInventory);
            (mockedPrisma.cartReservation.findFirst as jest.Mock).mockResolvedValue(baseReservation);
        });

        it('returns url, orderId, and totalAmountCents', async () => {
            const result = await createCheckoutSession(USER_ID, PLANT_ID, 'pickup', 'nursery-1');

            expect(result).toEqual({
                url: SESSION_URL,
                orderId: ORDER_ID,
                totalAmountCents: basePlant.price, // no delivery fee
            });
        });

        it('creates a Checkout Session with the correct amount, currency, and metadata', async () => {
            await createCheckoutSession(USER_ID, PLANT_ID, 'pickup', 'nursery-1');

            expect(mockSessionsCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    mode: 'payment',
                    line_items: [
                        {
                            price_data: {
                                currency: 'mxn',
                                product_data: { name: `Solo Plantas — ${basePlant.name}` },
                                unit_amount: basePlant.price,
                            },
                            quantity: 1,
                        },
                    ],
                    metadata: { userId: USER_ID, plantId: PLANT_ID },
                })
            );
        });

        it('creates the order with status "pending" and correct fields', async () => {
            await createCheckoutSession(USER_ID, PLANT_ID, 'pickup', 'nursery-1');

            expect(mockedPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: USER_ID,
                        plantId: PLANT_ID,
                        status: 'pending',
                        shippingType: 'pickup',
                        stripePaymentIntentId: SESSION_ID,
                        nurseryId: 'nursery-1',
                        shippingAddress: null,
                    }),
                })
            );
        });

        it('sets shippingFeeCents to 0 for pickup orders', async () => {
            await createCheckoutSession(USER_ID, PLANT_ID, 'pickup', 'nursery-1');

            expect(mockedPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ shippingFeeCents: 0 }),
                })
            );
        });
    });

    describe('happy path — delivery', () => {
        const address = { street: 'Calle', city: 'Ciudad', state: 'Ciudad', zipCode: '06600', country: 'MX' };

        beforeEach(() => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);
            (mockedPrisma.inventory.findUnique as jest.Mock).mockResolvedValue(baseInventory);
            (mockedPrisma.cartReservation.findFirst as jest.Mock).mockResolvedValue(baseReservation);
        });

        it('adds the delivery fee to totalAmountCents', async () => {
            const result = await createCheckoutSession(USER_ID, PLANT_ID, 'delivery', undefined, address);

            expect(result.totalAmountCents).toBe(basePlant.price + 9900);
        });

        it('sets shippingFeeCents to 9900 for delivery orders', async () => {
            await createCheckoutSession(USER_ID, PLANT_ID, 'delivery', undefined, address);

            expect(mockedPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ shippingFeeCents: 9900 }),
                })
            );
        });

        it('serializes and stores the shipping address', async () => {
            await createCheckoutSession(USER_ID, PLANT_ID, 'delivery', undefined, address);

            expect(mockedPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        shippingAddress: JSON.stringify(address),
                        nurseryId: null,
                    }),
                })
            );
        });
    });

    describe('guard clauses', () => {
        it('throws 404 AppError when the plant does not exist', async () => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                createCheckoutSession(USER_ID, PLANT_ID, 'pickup')
            ).rejects.toThrow(new AppError('Plant not found', 404));
        });

        it('throws 409 AppError when the plant is not available for purchase', async () => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue({
                ...basePlant,
                priceActive: false,
            });

            await expect(
                createCheckoutSession(USER_ID, PLANT_ID, 'pickup')
            ).rejects.toThrow(new AppError('This plant is not available for purchase', 409));
        });

        it('throws 404 AppError when plant inventory does not exist', async () => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);
            (mockedPrisma.inventory.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                createCheckoutSession(USER_ID, PLANT_ID, 'pickup')
            ).rejects.toThrow(new AppError('Plant inventory not found', 404));
        });

        it('throws 409 AppError when no active cart reservation exists', async () => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);
            (mockedPrisma.inventory.findUnique as jest.Mock).mockResolvedValue(baseInventory);
            (mockedPrisma.cartReservation.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(
                createCheckoutSession(USER_ID, PLANT_ID, 'pickup')
            ).rejects.toThrow(new AppError('No active cart reservation found. Add the plant to your cart before checking out.', 409));
        });

        it('does not create a CheckoutSession or Order when a guard throws', async () => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(createCheckoutSession(USER_ID, PLANT_ID, 'pickup')).rejects.toThrow();

            expect(mockSessionsCreate).not.toHaveBeenCalled();
            expect(mockedPrisma.order.create).not.toHaveBeenCalled();
        });

        it('looks up the active reservation with a future expiresAt filter', async () => {
            (mockedPrisma.plant.findUnique as jest.Mock).mockResolvedValue(basePlant);
            (mockedPrisma.inventory.findUnique as jest.Mock).mockResolvedValue(baseInventory);
            (mockedPrisma.cartReservation.findFirst as jest.Mock).mockResolvedValue(baseReservation);

            const before = new Date();
            await createCheckoutSession(USER_ID, PLANT_ID, 'pickup', 'nursery-1');

            const reservationCall = (mockedPrisma.cartReservation.findFirst as jest.Mock).mock.calls[0][0];
            expect(reservationCall.where.userId).toBe(USER_ID);
            expect(reservationCall.where.inventoryId).toBe(INVENTORY_ID);
            expect(reservationCall.where.expiresAt.gt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100);
        });
    });
});

// ── handleWebhook ──────────────────────────────────────────────────────────

describe('handleWebhook', () => {
    const RAW_BODY = Buffer.from('{}');
    const SIGNATURE = 'stripe-sig';

    it('throws 400 AppError when the webhook signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Signature verification failed');
        });

        await expect(handleWebhook(RAW_BODY, SIGNATURE)).rejects.toThrow(
            new AppError('Invalid webhook signature', 400)
        );
    });

    it('verifies the signature using the raw body and signature header', async () => {
        mockConstructEvent.mockReturnValue(makeStripeEvent('unknown.event', SESSION_ID));

        await handleWebhook(RAW_BODY, SIGNATURE);

        expect(mockConstructEvent).toHaveBeenCalledWith(RAW_BODY, SIGNATURE, 'whsec_fake');
    });

    it('resolves without error for unhandled event types', async () => {
        mockConstructEvent.mockReturnValue(makeStripeEvent('customer.created', SESSION_ID));

        await expect(handleWebhook(RAW_BODY, SIGNATURE)).resolves.not.toThrow();
    });

    // ── confirmPayment (via checkout.session.completed) ────────────────────────

    describe('checkout.session.completed', () => {
        let tx: MockTx;

        beforeEach(() => {
            mockConstructEvent.mockReturnValue(
                makeStripeEvent('checkout.session.completed', SESSION_ID)
            );
            (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue(baseOrder);

            tx = makeTx();
            tx.inventory.findUnique.mockResolvedValue(baseInventory);
            mockTransaction(tx);
        });

        it('updates the order status to "confirmed"', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.order.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: ORDER_ID },
                    data: expect.objectContaining({ status: 'confirmed' }),
                })
            );
        });

        it('moves inventory from reserved to sold', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.inventory.updateMany).toHaveBeenCalledWith({
                where: { plantId: PLANT_ID },
                data: { reserved: { decrement: 1 }, sold: { increment: 1 } },
            });
        });

        it('upserts the UserPlant record with owned: true', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.userPlant.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId_plantId: { userId: USER_ID, plantId: PLANT_ID } },
                    create: expect.objectContaining({ owned: true }),
                    update: expect.objectContaining({ owned: true }),
                })
            );
        });

        it('deletes the CartReservation for the user and inventory', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.cartReservation.deleteMany).toHaveBeenCalledWith({
                where: { userId: USER_ID, inventoryId: INVENTORY_ID },
            });
        });

        it('skips the transaction when the order status is not "pending"', async () => {
            (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue({
                ...baseOrder,
                status: 'confirmed',
            });

            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
        });

        it('skips the transaction when no order is found for the CheckoutSession', async () => {
            (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);

            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
        });

        it('does not delete reservations when inventory is not found', async () => {
            tx.inventory.findUnique.mockResolvedValue(null);

            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.cartReservation.deleteMany).not.toHaveBeenCalled();
        });

        it('looks up the order by stripePaymentIntentId (which stores sessionId)', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(mockedPrisma.order.findFirst).toHaveBeenCalledWith({
                where: { stripePaymentIntentId: SESSION_ID },
            });
        });
    });

    // ── cancelPayment (via checkout.session.expired) ───────────────────

    describe('checkout.session.expired', () => {
        let tx: MockTx;

        beforeEach(() => {
            mockConstructEvent.mockReturnValue(
                makeStripeEvent('checkout.session.expired', SESSION_ID)
            );
            (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue(baseOrder);

            tx = makeTx();
            tx.inventory.findUnique.mockResolvedValue(baseInventory);
            mockTransaction(tx);
        });

        it('updates the order status to "cancelled"', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.order.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: ORDER_ID },
                    data: expect.objectContaining({ status: 'cancelled' }),
                })
            );
        });

        it('moves inventory from reserved back to stock', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.inventory.updateMany).toHaveBeenCalledWith({
                where: { plantId: PLANT_ID },
                data: { reserved: { decrement: 1 }, stock: { increment: 1 } },
            });
        });

        it('deletes the CartReservation for the user and inventory', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.cartReservation.deleteMany).toHaveBeenCalledWith({
                where: { userId: USER_ID, inventoryId: INVENTORY_ID },
            });
        });

        it('does not upsert a UserPlant on failure', async () => {
            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.userPlant.upsert).not.toHaveBeenCalled();
        });

        it('skips the transaction when the order status is not "pending" (idempotency)', async () => {
            (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue({
                ...baseOrder,
                status: 'cancelled',
            });

            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
        });

        it('skips the transaction when no order is found for the CheckoutSession (idempotency)', async () => {
            (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);

            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
        });

        it('does not delete reservations when inventory is not found', async () => {
            tx.inventory.findUnique.mockResolvedValue(null);

            await handleWebhook(RAW_BODY, SIGNATURE);

            expect(tx.cartReservation.deleteMany).not.toHaveBeenCalled();
        });
    });
});