/**
 * src/routes/orders.routes.ts
 * ===========================
 * Order management routes. All require authentication.
 *
 *   GET  /           — Order history
 *   GET  /:id        — Order detail
 *   POST /:id/activate — QR scan activation
 * ===========================
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as ordersController from '../controllers/orders.controller';

const router = Router();

// All order routes require authentication
router.use(authenticate);

router.get('/', ordersController.listOrders);
router.get('/:id', ordersController.getOrder);
router.post('/:id/activate', ordersController.activateOrder);

export default router;
