/**
 * src/services/cart.service.test.ts
 * =====================================
 * Unit tests for cart.service.ts
 *
 * Mocks:
 *   - prisma
 *   - env
 */

import { reserveInventory, releaseReservation } from '../services/cart.service';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
    prisma: {
        $transaction: jest.fn(),
    },
}));

jest.mock('../config/env', () => ({
    env: { CART_RESERVATION_MINUTES: 15 },
}));

// ── Types ──────────────────────────────────────────────────────────────────

interface MockTx {
    inventory: {
        findFirst: jest.Mock;
        update: jest.Mock;
    };
    userPlant: {
        findUnique: jest.Mock;
    };
    cartReservation: {
        findUnique: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
    };
}

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

function mockTransaction(tx: MockTx) {
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: MockTx) => Promise<unknown>) => cb(tx)
    );
}

function makeTx(): MockTx {
    return {
        inventory: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        userPlant: {
            findUnique: jest.fn(),
        },
        cartReservation: {
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
    };
}

// ── Shared fixtures ────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000000';
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000001';
const PLANT_ID = '00000000-0000-0000-0000-000000000002';
const INVENTORY_ID = '00000000-0000-0000-0000-000000000003';
const RESERVATION_ID = '00000000-0000-0000-0000-000000000004';

const baseInventory = {
    id: INVENTORY_ID,
    plantId: PLANT_ID,
    stock: 10,
    reserved: 2,
};

const baseReservation = {
    id: RESERVATION_ID,
    userId: USER_ID,
    inventoryId: INVENTORY_ID,
    quantity: 2,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
};

// ── reserveInventory ───────────────────────────────────────────────────────

describe('reserveInventory', () => {
    let tx: MockTx;

    beforeEach(() => {
        tx = makeTx();
        mockTransaction(tx);
    });

    it('returns the created reservation on success', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        const result = await reserveInventory(USER_ID, PLANT_ID, 2);

        expect(result).toEqual(baseReservation);
    });

    it('decrements stock and increments reserved on the inventory', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        await reserveInventory(USER_ID, PLANT_ID, 2);

        expect(tx.inventory.update).toHaveBeenCalledWith({
            where: { id: INVENTORY_ID },
            data: {
                stock: { decrement: 2 },
                reserved: { increment: 2 },
            },
        });
    });

    it('creates the reservation with correct userId, inventoryId, quantity, and expiresAt', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        const before = Date.now();
        await reserveInventory(USER_ID, PLANT_ID, 2);
        const after = Date.now();

        const createCall = tx.cartReservation.create.mock.calls[0][0];
        expect(createCall.data.userId).toBe(USER_ID);
        expect(createCall.data.inventoryId).toBe(INVENTORY_ID);
        expect(createCall.data.quantity).toBe(2);

        const expiresMs = createCall.data.expiresAt.getTime();
        expect(expiresMs).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
        expect(expiresMs).toBeLessThanOrEqual(after + 15 * 60 * 1000);
    });

    it('looks up inventory by plantId', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        await reserveInventory(USER_ID, PLANT_ID, 2);

        expect(tx.inventory.findFirst).toHaveBeenCalledWith({
            where: { plantId: PLANT_ID },
        });
    });

    it('checks ownership with the correct composite key', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        await reserveInventory(USER_ID, PLANT_ID, 2);

        expect(tx.userPlant.findUnique).toHaveBeenCalledWith({
            where: { userId_plantId: { userId: USER_ID, plantId: PLANT_ID } },
        });
    });

    it('allows reservation when stock exactly equals quantity', async () => {
        tx.inventory.findFirst.mockResolvedValue({ ...baseInventory, stock: 2 });
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).resolves.not.toThrow();
    });

    it('throws 404 AppError when inventory does not exist', async () => {
        tx.inventory.findFirst.mockResolvedValue(null);

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).rejects.toThrow(
            new AppError('Plant inventory not found', 404)
        );
    });

    it('throws 409 AppError when the user already owns the plant', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue({ owned: true });

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).rejects.toThrow(
            new AppError('You already own this plant', 409)
        );
    });

    it('does not throw when userPlant exists but owned is false', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue({ owned: false });
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).resolves.not.toThrow();
    });

    it('does not throw when userPlant record does not exist', async () => {
        tx.inventory.findFirst.mockResolvedValue(baseInventory);
        tx.userPlant.findUnique.mockResolvedValue(null);
        tx.cartReservation.create.mockResolvedValue(baseReservation);

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).resolves.not.toThrow();
    });

    it('throws 409 AppError with available stock count when stock is insufficient', async () => {
        tx.inventory.findFirst.mockResolvedValue({ ...baseInventory, stock: 1 });
        tx.userPlant.findUnique.mockResolvedValue(null);

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).rejects.toThrow(
            new AppError('Insufficient stock. Available: 1', 409)
        );
    });

    it('throws 409 AppError when stock is zero', async () => {
        tx.inventory.findFirst.mockResolvedValue({ ...baseInventory, stock: 0 });
        tx.userPlant.findUnique.mockResolvedValue(null);

        await expect(reserveInventory(USER_ID, PLANT_ID, 1)).rejects.toThrow(
            new AppError('Insufficient stock. Available: 0', 409)
        );
    });

    it('does not update inventory or create a reservation when a guard throws', async () => {
        tx.inventory.findFirst.mockResolvedValue(null);

        await expect(reserveInventory(USER_ID, PLANT_ID, 2)).rejects.toThrow();

        expect(tx.inventory.update).not.toHaveBeenCalled();
        expect(tx.cartReservation.create).not.toHaveBeenCalled();
    });
});

// ── releaseReservation ─────────────────────────────────────────────────────

describe('releaseReservation', () => {
    let tx: MockTx;

    beforeEach(() => {
        tx = makeTx();
        mockTransaction(tx);
    });

    it('returns released: true with the reservationId on success', async () => {
        tx.cartReservation.findUnique.mockResolvedValue(baseReservation);

        const result = await releaseReservation(RESERVATION_ID, USER_ID);

        expect(result).toEqual({ released: true, reservationId: RESERVATION_ID });
    });

    it('increments stock and decrements reserved on the inventory', async () => {
        tx.cartReservation.findUnique.mockResolvedValue(baseReservation);

        await releaseReservation(RESERVATION_ID, USER_ID);

        expect(tx.inventory.update).toHaveBeenCalledWith({
            where: { id: INVENTORY_ID },
            data: {
                reserved: { decrement: baseReservation.quantity },
                stock: { increment: baseReservation.quantity },
            },
        });
    });

    it('deletes the reservation record', async () => {
        tx.cartReservation.findUnique.mockResolvedValue(baseReservation);

        await releaseReservation(RESERVATION_ID, USER_ID);

        expect(tx.cartReservation.delete).toHaveBeenCalledWith({
            where: { id: RESERVATION_ID },
        });
    });

    it('deletes the reservation after updating inventory', async () => {
        const callOrder: string[] = [];
        tx.cartReservation.findUnique.mockResolvedValue(baseReservation);
        tx.inventory.update.mockImplementation(() => {
            callOrder.push('inventory.update');
            return Promise.resolve();
        });
        tx.cartReservation.delete.mockImplementation(() => {
            callOrder.push('cartReservation.delete');
            return Promise.resolve();
        });

        await releaseReservation(RESERVATION_ID, USER_ID);

        expect(callOrder).toEqual(['inventory.update', 'cartReservation.delete']);
    });

    it('throws 404 AppError when the reservation does not exist', async () => {
        tx.cartReservation.findUnique.mockResolvedValue(null);

        await expect(releaseReservation('nonexistent', USER_ID)).rejects.toThrow(
            new AppError('Reservation not found', 404)
        );
    });

    it('throws 403 AppError when the reservation belongs to a different user', async () => {
        tx.cartReservation.findUnique.mockResolvedValue({
            ...baseReservation,
            userId: OTHER_USER_ID,
        });

        await expect(releaseReservation(RESERVATION_ID, USER_ID)).rejects.toThrow(
            new AppError('Forbidden', 403)
        );
    });

    it('does not update inventory or delete the reservation when a guard throws', async () => {
        tx.cartReservation.findUnique.mockResolvedValue(null);

        await expect(releaseReservation(RESERVATION_ID, USER_ID)).rejects.toThrow();

        expect(tx.inventory.update).not.toHaveBeenCalled();
        expect(tx.cartReservation.delete).not.toHaveBeenCalled();
    });
});