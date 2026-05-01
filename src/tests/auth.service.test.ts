/**
 * src/services/auth.service.test.ts
 * =====================================
 * Unit tests for auth.service.ts
 *
 * Mocks:
 *   - prisma
 *   - bcrypt
 *   - signToken
 */

import bcrypt from 'bcrypt';
import { registerUser, loginUser, getCurrentUser } from '../services/auth.service';
import { prisma } from '../config/database';
import { signToken } from '../utils/jwt.utils';
import { AppError } from '../middlewares/error.middleware';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.mock('bcrypt');

jest.mock('../utils/jwt.utils', () => ({
    signToken: jest.fn(),
}));

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedSignToken = signToken as jest.Mock;

// ── Shared fixtures ────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-0000-0000-000000000000';
const USER_EMAIL = 'email@example.com';
const USER_PASSWORD = 'pass123';
const PASSWORD_HASH = 'hashed_pass123';
const TOKEN = 'jwt.token.example';

const baseUser = {
    id: USER_ID,
    email: USER_EMAIL,
    passwordHash: PASSWORD_HASH,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
};

const publicUser = {
    id: USER_ID,
    email: USER_EMAIL,
    createdAt: baseUser.createdAt,
};

// ── registerUser ───────────────────────────────────────────────────────────

describe('registerUser', () => {
    beforeEach(() => {
        mockedSignToken.mockReturnValue(TOKEN);
    });

    it('returns a token and public user fields on success', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(PASSWORD_HASH);
        (mockedPrisma.user.create as jest.Mock).mockResolvedValue(publicUser);

        const result = await registerUser({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(result).toEqual({ token: TOKEN, user: publicUser });
    });

    it('hashes the password with bcrypt at cost factor 12', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(PASSWORD_HASH);
        (mockedPrisma.user.create as jest.Mock).mockResolvedValue(publicUser);

        await registerUser({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(mockedBcrypt.hash).toHaveBeenCalledWith(USER_PASSWORD, 12);
    });

    it('stores the hashed password, not the plain text', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(PASSWORD_HASH);
        (mockedPrisma.user.create as jest.Mock).mockResolvedValue(publicUser);

        await registerUser({ email: USER_EMAIL, password: USER_PASSWORD });

        const createCall = (mockedPrisma.user.create as jest.Mock).mock.calls[0][0];
        expect(createCall.data.passwordHash).toBe(PASSWORD_HASH);
        expect(createCall.data.password).toBeUndefined();
    });

    it('signs a token with the new user id and email', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.hash as jest.Mock).mockResolvedValue(PASSWORD_HASH);
        (mockedPrisma.user.create as jest.Mock).mockResolvedValue(publicUser);

        await registerUser({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(mockedSignToken).toHaveBeenCalledWith(USER_ID, USER_EMAIL);
    });

    it('throws 409 AppError when the email is already registered', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

        await expect(
            registerUser({ email: USER_EMAIL, password: USER_PASSWORD })
        ).rejects.toThrow(new AppError('Email already registered', 409));
    });

    it('does not hash the password or create a user when email already exists', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

        await expect(
            registerUser({ email: USER_EMAIL, password: USER_PASSWORD })
        ).rejects.toThrow();

        expect(mockedBcrypt.hash).not.toHaveBeenCalled();
        expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    });
});

// ── loginUser ──────────────────────────────────────────────────────────────

describe('loginUser', () => {
    beforeEach(() => {
        mockedSignToken.mockReturnValue(TOKEN);
    });

    it('returns a token and public user fields on successful login', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await loginUser({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(result).toEqual({
            token: TOKEN,
            user: { id: USER_ID, email: USER_EMAIL, createdAt: baseUser.createdAt },
        });
    });

    it('compares the supplied password against the stored hash', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

        await loginUser({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(mockedBcrypt.compare).toHaveBeenCalledWith(USER_PASSWORD, PASSWORD_HASH);
    });

    it('signs a token with the authenticated user id and email', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

        await loginUser({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(mockedSignToken).toHaveBeenCalledWith(USER_ID, USER_EMAIL);
    });

    it('throws 401 AppError when the user does not exist', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
            loginUser({ email: USER_EMAIL, password: USER_PASSWORD })
        ).rejects.toThrow(new AppError('Invalid email or password', 401));
    });

    it('throws 401 AppError when the password is incorrect', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
            loginUser({ email: USER_EMAIL, password: 'wrongpassword' })
        ).rejects.toThrow(new AppError('Invalid email or password', 401));
    });

    it('still calls bcrypt.compare when the user does not exist', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
            loginUser({ email: USER_EMAIL, password: USER_PASSWORD })
        ).rejects.toThrow();

        expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('compares against the hash, not the supplied password, when user is not found', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
            loginUser({ email: USER_EMAIL, password: USER_PASSWORD })
        ).rejects.toThrow();

        const [, hashArg] = (mockedBcrypt.compare as jest.Mock).mock.calls[0];
        expect(hashArg).toMatch(/^\$2b\$12\$/);
    });

    it('does not sign a token when credentials are invalid', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
            loginUser({ email: USER_EMAIL, password: 'wrongpassword' })
        ).rejects.toThrow();

        expect(mockedSignToken).not.toHaveBeenCalled();
    });
});

// ── getCurrentUser ─────────────────────────────────────────────────────────

describe('getCurrentUser', () => {
    const fullUser = {
        id: USER_ID,
        email: USER_EMAIL,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
        _count: {
            userPlants: 3,
            orders: 5,
        },
    };

    it('returns the user profile with counts', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(fullUser);

        const result = await getCurrentUser(USER_ID);

        expect(result).toEqual(fullUser);
    });

    it('queries by userId', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(fullUser);

        await getCurrentUser(USER_ID);

        expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
            where: { id: USER_ID },
            select: {
                id: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        userPlants: { where: { owned: true } },
                        orders: true,
                    },
                },
            },
        });
    });

    it('throws 404 AppError when the user does not exist', async () => {
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(getCurrentUser('nonexistent')).rejects.toThrow(
            new AppError('User not found', 404)
        );
    });
});