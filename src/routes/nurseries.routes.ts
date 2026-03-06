/**
 * src/routes/nurseries.routes.ts
 * ===========================
 * Nursery pickup location routes.
 *
 *   GET / — List all nurseries (public, no auth required)
 * ===========================
 */

import { Router } from 'express';
import * as nurseriesController from '../controllers/nurseries.controller';

const router = Router();

// Public endpoint — no authentication needed
router.get('/', nurseriesController.listNurseries);

export default router;
