/**
 * src/controllers/catalog.controller.ts
 * ===========================
 * Plant catalog route handlers.
 *
 * Routes:
 *   GET /api/v1/catalog
 *   GET /api/v1/catalog/recommendations?lat=&lon=
 *   GET /api/v1/catalog/:id
 *   GET /api/v1/catalog/:id/seed
 * ===========================
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/response.utils';
import { AppError } from '../middlewares/error.middleware';
import * as catalogService from '../services/catalog.service';

/**
 * GET /api/v1/catalog
 * Lists all plants with owned status for the authenticated user.
 */
export async function listPlants(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const plants = await catalogService.getAllPlants(userId);
    sendSuccess(res, plants);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/catalog/recommendations?lat=&lon=
 * Returns climate-appropriate plants based on current location.
 */
export async function getRecommendations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      throw new AppError('lat and lon query parameters are required', 400);
    }

    const result = await catalogService.getRecommendations(userId, lat, lon);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/catalog/:id
 * Returns full plant detail including care guide.
 */
export async function getPlant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const plant = await catalogService.getPlantById(req.params.id, userId);
    sendSuccess(res, plant);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/catalog/:id/seed
 * Returns the L-System JSON seed. Only accessible to plant owners.
 */
export async function getPlantSeed(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const seed = await catalogService.getPlantSeed(req.params.id, userId);
    sendSuccess(res, seed);
  } catch (err) {
    next(err);
  }
}
