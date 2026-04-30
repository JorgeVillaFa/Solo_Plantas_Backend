/**
 * src/routes/index.ts
 * ===========================
 * Main API router — aggregates all route modules under /api/v1.
 *
 * Mounted in index.ts as:
 *   app.use('/api/v1', apiRoutes);
 *
 * Resulting base paths:
 *   /api/v1/auth/*
 *   /api/v1/catalog/*
 *   /api/v1/cart/*
 *   /api/v1/payments/*
 *   /api/v1/orders/*
 *   /api/v1/nurseries/*
 * ===========================
 */

import { Router } from 'express';
import authRoutes      from './auth.routes';
import catalogRoutes   from './catalog.routes';
import cartRoutes      from './cart.routes';
import paymentsRoutes  from './payments.routes';
import ordersRoutes    from './orders.routes';
import nurseriesRoutes from './nurseries.routes';
import chatRoutes      from './chat.routes';

const router = Router();

router.use('/auth',      authRoutes);
router.use('/catalog',   catalogRoutes);
router.use('/cart',      cartRoutes);
router.use('/payments',  paymentsRoutes);
router.use('/orders',    ordersRoutes);
router.use('/nurseries', nurseriesRoutes);
router.use('/chat',      chatRoutes);

export default router;
