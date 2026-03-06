/**
 * src/routes/catalog.routes.ts
 * ===========================
 * Plant catalog routes. All require authentication.
 *
 *   GET /               — All plants with owned status
 *   GET /recommendations?lat=&lon=  — Climate-based recommendations
 *   GET /:id            — Plant detail + care guide
 *   GET /:id/seed       — L-System JSON seed (owners only)
 * ===========================
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as catalogController from '../controllers/catalog.controller';

const router = Router();

// All catalog routes require authentication
router.use(authenticate);

// NOTE: /recommendations must be declared before /:id to prevent route collision
router.get('/recommendations', catalogController.getRecommendations);
router.get('/', catalogController.listPlants);
router.get('/:id', catalogController.getPlant);
router.get('/:id/seed', catalogController.getPlantSeed);

export default router;
