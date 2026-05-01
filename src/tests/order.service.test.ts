/**
 * src/services/orders.service.test.ts
 * =====================================
 * Unit tests for orders.service.ts
 *
 * Mocks:
 *   - prisma
 *   - serializePrice
 */

import {
    getUserOrders,
    getOrderById,
    activateOrder,
} from '../services/orders.service';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
    prisma: {
        order: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        userPlant: {
            update: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock('../utils/price.utils', () => ({
    serializePrice: jest.fn((price: number, active: boolean) =>
        active ? price / 100 : null
    ),
}));

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// ── Shared fixtures ────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000000';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000001';
const ORDER_ID = '00000000-0000-0000-0000-000000000002';
const PLANT_ID = '00000000-0000-0000-0000-000000000003';

const basePlant = {
    id: PLANT_ID,
    name: 'Rosa',
    scientificName: 'Rosa rubiginosa',
    illustrationName: 'rose.svg',
    price: 17442,
    priceActive: true,
};

const baseNursery = {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Vivero',
    address: 'Calle',
};

const baseOrder = {
    id: ORDER_ID,
    userId: USER_ID,
    status: 'confirmed',
    shippingType: 'standard',
    totalAmountCents: 17442,
    shippingFeeCents: 9900,
    trackingNumber: 'ORDER-001',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-02'),
    activatedAt: null,
    plantId: PLANT_ID,
    plant: basePlant,
    nursery: baseNursery,
};

// ── getUserOrders ──────────────────────────────────────────────────────────

describe('getUserOrders', () => {
    it('returns orders with serialized plant price', async () => {
        (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([baseOrder]);

        const result = await getUserOrders(USER_ID);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(ORDER_ID);
        expect(result[0].plant?.price).toBe(174.42);
    });

    it('sets plant price to null when priceActive is false', async () => {
        const inactiveOrder = {
            ...baseOrder,
            plant: { ...basePlant, priceActive: false },
        };
        (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([inactiveOrder]);

        const result = await getUserOrders(USER_ID);

        expect(result[0].plant?.price).toBeNull();
    });

    it('sets plant to null when order has no plant', async () => {
        (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([
            { ...baseOrder, plant: null },
        ]);

        const result = await getUserOrders(USER_ID);

        expect(result[0].plant).toBeNull();
    });

    it('returns an empty array when the user has no orders', async () => {
        (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([]);

        const result = await getUserOrders(USER_ID);

        expect(result).toEqual([]);
    });

    it('queries only the authenticated user\'s orders ordered newest first', async () => {
        (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([]);

        await getUserOrders(USER_ID);

        expect(mockedPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: USER_ID },
                orderBy: { createdAt: 'desc' },
            })
        );
    });

    it('preserves all non-plant order fields unchanged', async () => {
        (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([baseOrder]);

        const result = await getUserOrders(USER_ID);

        expect(result[0]).toMatchObject({
            id: ORDER_ID,
            status: 'confirmed',
            shippingType: 'standard',
            totalAmountCents: 17442,
            shippingFeeCents: 9900,
            trackingNumber: 'ORDER-001',
            nursery: baseNursery,
        });
    });
});

// ── getOrderById ───────────────────────────────────────────────────────────

describe('getOrderById', () => {
    it('returns full order detail with serialized plant price', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);

        const result = await getOrderById(ORDER_ID, USER_ID);

        expect(result.id).toBe(ORDER_ID);
        expect(result.plant?.price).toBe(174.42);
        expect(result.nursery).toEqual(baseNursery);
    });

    it('sets plant to null when order has no associated plant', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            plant: null,
        });

        const result = await getOrderById(ORDER_ID, USER_ID);

        expect(result.plant).toBeNull();
    });

    it('throws 404 AppError when the order does not exist', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(getOrderById('nonexistent', USER_ID)).rejects.toThrow(
            new AppError('Order not found', 404)
        );
    });

    it('throws 403 AppError when the order belongs to a different user', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            userId: OTHER_USER_ID,
        });

        await expect(getOrderById(ORDER_ID, USER_ID)).rejects.toThrow(
            new AppError('Forbidden', 403)
        );
    });

    it('does not throw when the order belongs to the requesting user', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);

        await expect(getOrderById(ORDER_ID, USER_ID)).resolves.not.toThrow();
    });
});

// ── activateOrder ──────────────────────────────────────────────────────────

describe('activateOrder', () => {
    beforeEach(() => {
        // Default: transaction resolves successfully
        (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([]);
    });

    it('returns activated result with orderId and a timestamp', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);

        const result = await activateOrder(ORDER_ID, USER_ID);

        expect(result.activated).toBe(true);
        expect(result.orderId).toBe(ORDER_ID);
        expect(result.activatedAt).toBeInstanceOf(Date);
    });

    it('runs order and userPlant updates inside a transaction', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);

        await activateOrder(ORDER_ID, USER_ID);

        expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
        // The transaction receives an array of two Prisma operations
        const transactionArg = (mockedPrisma.$transaction as jest.Mock).mock.calls[0][0];
        expect(Array.isArray(transactionArg)).toBe(true);
        expect(transactionArg).toHaveLength(2);
    });

    it('updates order with activatedAt and status "activated"', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);

        await activateOrder(ORDER_ID, USER_ID);

        expect(mockedPrisma.order.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: ORDER_ID },
                data: expect.objectContaining({ status: 'activated' }),
            })
        );
    });

    it('updates userPlant with the correct composite key', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);

        await activateOrder(ORDER_ID, USER_ID);

        expect(mockedPrisma.userPlant.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId_plantId: { userId: USER_ID, plantId: PLANT_ID } },
            })
        );
    });

    it('also activates orders with status "delivered"', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            status: 'delivered',
        });

        const result = await activateOrder(ORDER_ID, USER_ID);

        expect(result.activated).toBe(true);
    });

    it('throws 404 AppError when the order does not exist', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(activateOrder('nonexistent', USER_ID)).rejects.toThrow(
            new AppError('Order not found', 404)
        );
    });

    it('throws 403 AppError when the order belongs to a different user', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            userId: OTHER_USER_ID,
        });

        await expect(activateOrder(ORDER_ID, USER_ID)).rejects.toThrow(
            new AppError('Forbidden', 403)
        );
    });

    it('throws 409 AppError when the order is already activated', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            activatedAt: new Date('2024-02-01'),
        });

        await expect(activateOrder(ORDER_ID, USER_ID)).rejects.toThrow(
            new AppError('Order already activated', 409)
        );
    });

    it('does not run the transaction when the order is already activated', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            activatedAt: new Date('2024-02-01'),
        });

        await expect(activateOrder(ORDER_ID, USER_ID)).rejects.toThrow();
        expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    });

    it.each(['pending', 'cancelled', 'refunded'])(
        'throws 400 AppError for non-activatable status "%s"',
        async (status) => {
            (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
                ...baseOrder,
                status,
            });

            await expect(activateOrder(ORDER_ID, USER_ID)).rejects.toThrow(
                new AppError('Order cannot be activated in its current status', 400)
            );
        }
    );

    it('does not run the transaction for a non-activatable status', async () => {
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
            ...baseOrder,
            status: 'pending',
        });

        await expect(activateOrder(ORDER_ID, USER_ID)).rejects.toThrow();
        expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    });
});