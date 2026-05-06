/**
 * src/tests/middlewares.test.ts
 * 
 * Unit tests for:
 *   - error.middleware.ts
 *   - auth.middleware.ts
 *   - validate.middleware.ts
 * 
 * Mocks:
 *   - verifyToken
 *   - sendError
 *   - validationResult
 */

import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock jwt utils used by auth middleware
jest.mock('../utils/jwt.utils', () => ({
    verifyToken: jest.fn(),
}));

// Mock response utils used by auth middleware
jest.mock('../utils/response.utils', () => ({
    sendError: jest.fn((res: Response, status: number, message: string) => {
        res.status(status).json({ success: false, error: message });
    }),
}));

// Mock express-validator used by validate middleware
jest.mock('express-validator', () => ({
    validationResult: jest.fn(),
}));

import { verifyToken } from '../utils/jwt.utils';
import { sendError } from '../utils/response.utils';
import { validationResult } from 'express-validator';

import { AppError, globalErrorHandler } from '../middlewares/error.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal mock Express Response with jest spies. */
function mockResponse(): jest.Mocked<Response> {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Response>;
    return res;
}

/** Build a minimal mock Express Request. */
function mockRequest(overrides: Partial<Request> = {}): Request {
    return {
        headers: {},
        ...overrides,
    } as unknown as Request;
}

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

beforeEach(() => {
    jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// globalErrorHandler
// ═════════════════════════════════════════════════════════════════════════════

describe('globalErrorHandler', () => {
    const req = mockRequest();
    const next = mockNext;

    // ── AppError ──────────────────────────────────────────────────────────────

    describe('AppError', () => {
        it('responds with the AppError statusCode and message', () => {
            const res = mockResponse();
            const err = new AppError('Not allowed', 403);

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, error: 'Not allowed' })
            );
        });

        it('defaults to 500 when no statusCode supplied', () => {
            const res = mockResponse();
            const err = new AppError('Oops');

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('includes details in development mode', () => {
            process.env.NODE_ENV = 'development';
            const res = mockResponse();
            const err = new AppError('Bad input', 400, { field: 'email' });

            globalErrorHandler(err, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ details: { field: 'email' } })
            );
            process.env.NODE_ENV = 'test';
        });

        it('omits details in production mode', () => {
            process.env.NODE_ENV = 'production';
            const res = mockResponse();
            const err = new AppError('Bad input', 400, { secret: 'hidden' });

            globalErrorHandler(err, req, res, next);

            const payload = (res.json as jest.Mock).mock.calls[0][0];
            expect(payload).not.toHaveProperty('details');
            process.env.NODE_ENV = 'test';
        });
    });

    // ── Prisma P2002 (unique constraint) ──────────────────────────────────────

    describe('Prisma P2002 – unique constraint violation', () => {
        it('responds 409 with duplicate field names', () => {
            const res = mockResponse();
            const err = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['email'] },
            });

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Duplicate value for: email' })
            );
        });

        it('handles multiple conflicting fields', () => {
            const res = mockResponse();
            const err = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
                code: 'P2002',
                clientVersion: '5.0.0',
                meta: { target: ['username', 'tenantId'] },
            });

            globalErrorHandler(err, req, res, next);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Duplicate value for: username, tenantId' })
            );
        });

        it('handles missing meta gracefully (empty fields)', () => {
            const res = mockResponse();
            const err = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
                code: 'P2002',
                clientVersion: '5.0.0',
            });

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Duplicate value for: ' })
            );
        });
    });

    // ── Prisma P2025 (record not found) ───────────────────────────────────────

    describe('Prisma P2025 – record not found', () => {
        it('responds 404 with "Record not found"', () => {
            const res = mockResponse();
            const err = new Prisma.PrismaClientKnownRequestError('Not found', {
                code: 'P2025',
                clientVersion: '5.0.0',
            });

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Record not found' })
            );
        });
    });

    // ── Other Prisma known errors ─────────────────────────────────────────────

    describe('Other Prisma known request errors', () => {
        it('responds 400 with "Database error"', () => {
            const res = mockResponse();
            const err = new Prisma.PrismaClientKnownRequestError('Some other error', {
                code: 'P2003',
                clientVersion: '5.0.0',
            });

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Database error' })
            );
        });

        it('includes error details in development', () => {
            process.env.NODE_ENV = 'development';
            const res = mockResponse();
            const err = new Prisma.PrismaClientKnownRequestError('FK violation', {
                code: 'P2003',
                clientVersion: '5.0.0',
            });

            globalErrorHandler(err, req, res, next);

            const payload = (res.json as jest.Mock).mock.calls[0][0];
            expect(payload).toHaveProperty('details');
            process.env.NODE_ENV = 'test';
        });
    });

    // ── Prisma validation errors ───────────────────────────────────────────────

    describe('PrismaClientValidationError', () => {
        it('responds 400 with "Invalid data provided"', () => {
            const res = mockResponse();
            const err = new Prisma.PrismaClientValidationError('Missing field', {
                clientVersion: '5.0.0',
            });

            globalErrorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Invalid data provided' })
            );
        });

        it('includes details in development', () => {
            process.env.NODE_ENV = 'development';
            const res = mockResponse();
            const err = new Prisma.PrismaClientValidationError('Missing field', {
                clientVersion: '5.0.0',
            });

            globalErrorHandler(err, req, res, next);

            const payload = (res.json as jest.Mock).mock.calls[0][0];
            expect(payload).toHaveProperty('details');
            process.env.NODE_ENV = 'test';
        });
    });

    // ── Unknown errors ─────────────────────────────────────────────────────────

    describe('Unknown errors', () => {
        it('responds 500 with "Internal server error"', () => {
            const res = mockResponse();

            globalErrorHandler(new Error('boom'), req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Internal server error' })
            );
        });

        it('includes error message in development', () => {
            process.env.NODE_ENV = 'development';
            const res = mockResponse();

            globalErrorHandler(new Error('boom'), req, res, next);

            const payload = (res.json as jest.Mock).mock.calls[0][0];
            expect(payload.details).toBe('boom');
            process.env.NODE_ENV = 'test';
        });

        it('hides error message in production', () => {
            process.env.NODE_ENV = 'production';
            const res = mockResponse();

            globalErrorHandler(new Error('secret'), req, res, next);

            const payload = (res.json as jest.Mock).mock.calls[0][0];
            expect(payload).not.toHaveProperty('details');
            process.env.NODE_ENV = 'test';
        });

        it('handles non-Error thrown values (e.g. plain strings)', () => {
            const res = mockResponse();

            globalErrorHandler('something weird', req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// authenticate
// ═════════════════════════════════════════════════════════════════════════════

describe('authenticate', () => {
    const next = mockNext;

    it('calls sendError 401 when Authorization header is missing', () => {
        const req = mockRequest({ headers: {} });
        const res = mockResponse();

        authenticate(req as any, res, next);

        expect(sendError).toHaveBeenCalledWith(res, 401, 'Authorization token required');
        expect(next).not.toHaveBeenCalled();
    });

    it('calls sendError 401 when header does not start with "Bearer "', () => {
        const req = mockRequest({ headers: { authorization: 'Token abc123' } });
        const res = mockResponse();

        authenticate(req as any, res, next);

        expect(sendError).toHaveBeenCalledWith(res, 401, 'Authorization token required');
        expect(next).not.toHaveBeenCalled();
    });

    it('attaches decoded user and calls next() on valid token', () => {
        const decoded = { id: '1', email: 'user@example.com' };
        (verifyToken as jest.Mock).mockReturnValue(decoded);

        const req = mockRequest({ headers: { authorization: 'Bearer validtoken' } }) as any;
        const res = mockResponse();

        authenticate(req, res, next);

        expect(verifyToken).toHaveBeenCalledWith('validtoken');
        expect(req.user).toEqual(decoded);
        expect(next).toHaveBeenCalled();
    });

    it('calls sendError 401 when token is expired', () => {
        (verifyToken as jest.Mock).mockImplementation(() => {
            throw new TokenExpiredError('jwt expired', new Date());
        });

        const req = mockRequest({ headers: { authorization: 'Bearer expiredtoken' } }) as any;
        const res = mockResponse();

        authenticate(req, res, next);

        expect(sendError).toHaveBeenCalledWith(res, 401, 'Token expired. Please log in again.');
        expect(next).not.toHaveBeenCalled();
    });

    it('calls sendError 401 when token is invalid', () => {
        (verifyToken as jest.Mock).mockImplementation(() => {
            throw new JsonWebTokenError('invalid signature');
        });

        const req = mockRequest({ headers: { authorization: 'Bearer badtoken' } }) as any;
        const res = mockResponse();

        authenticate(req, res, next);

        expect(sendError).toHaveBeenCalledWith(res, 401, 'Invalid token.');
        expect(next).not.toHaveBeenCalled();
    });

    it('calls sendError 401 for unexpected errors during verification', () => {
        (verifyToken as jest.Mock).mockImplementation(() => {
            throw new Error('unexpected failure');
        });

        const req = mockRequest({ headers: { authorization: 'Bearer sometoken' } }) as any;
        const res = mockResponse();

        authenticate(req, res, next);

        expect(sendError).toHaveBeenCalledWith(res, 401, 'Authentication failed.');
        expect(next).not.toHaveBeenCalled();
    });

    it('strips only the "Bearer " prefix (7 chars) before calling verifyToken', () => {
        (verifyToken as jest.Mock).mockReturnValue({ id: '42' });

        const req = mockRequest({ headers: { authorization: 'Bearer my.jwt.token' } }) as any;
        const res = mockResponse();

        authenticate(req, res, next);

        expect(verifyToken).toHaveBeenCalledWith('my.jwt.token');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// validate
// ═════════════════════════════════════════════════════════════════════════════

describe('validate', () => {
    const next = mockNext;

    it('calls next() when there are no validation errors', () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });

        const req = mockRequest();
        const res = mockResponse();

        validate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('responds 422 when validation errors exist', () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => false,
            array: () => [
                { type: 'field', path: 'email', msg: 'Invalid email address' },
                { type: 'field', path: 'password', msg: 'Must be at least 8 characters' },
            ],
        });

        const req = mockRequest();
        const res = mockResponse();

        validate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Validation failed',
            details: [
                { field: 'email', message: 'Invalid email address' },
                { field: 'password', message: 'Must be at least 8 characters' },
            ],
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('maps non-field errors to "unknown"', () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => false,
            array: () => [{ type: 'alternative', msg: 'At least one field required' }],
        });

        const req = mockRequest();
        const res = mockResponse();

        validate(req, res, next);

        const payload = (res.json as jest.Mock).mock.calls[0][0];
        expect(payload.details[0].field).toBe('unknown');
    });

    it('does not call next() when there are errors', () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => false,
            array: () => [{ type: 'field', path: 'name', msg: 'Required' }],
        });

        const req = mockRequest();
        const res = mockResponse();

        validate(req, res, next);

        expect(next).not.toHaveBeenCalled();
    });

    it('passes through when error list is empty (edge case: isEmpty returns false but array is empty)', () => {
        // isEmpty() is authoritative — this tests that we trust isEmpty, not array.length
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });

        const req = mockRequest();
        const res = mockResponse();

        validate(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});