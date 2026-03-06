/**
 * src/controllers/nurseries.controller.ts
 * ===========================
 * Nursery (pickup location) route handlers.
 *
 * Routes:
 *   GET /api/v1/nurseries — List all pickup locations (public, no auth)
 * ===========================
 */

import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.utils';
import { prisma } from '../config/database';

/**
 * GET /api/v1/nurseries
 * Returns all nursery pickup locations for the MapKit map.
 * Public endpoint — no authentication required.
 */
export async function listNurseries(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const nurseries = await prisma.nursery.findMany({
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, nurseries);
  } catch (err) {
    next(err);
  }
}
