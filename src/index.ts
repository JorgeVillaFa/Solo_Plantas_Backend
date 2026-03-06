/**
 * src/index.ts
 * ===========================
 * Solo Plantas API — Express server entry point
 *
 * Initialization order (important):
 *   1. Load environment variables (dotenv)
 *   2. Validate required env vars (config/env.ts — throws fast if misconfigured)
 *   3. Configure Express with security + logging middleware
 *   4. Register raw-body route (Stripe webhook) BEFORE JSON parser
 *   5. Register JSON parser
 *   6. Mount all API routers under /api/v1
 *   7. Health check endpoint
 *   8. Global error handler (must be last)
 *   9. Start HTTP server + background tasks
 *  10. Graceful shutdown on SIGTERM/SIGINT
 *
 * Architecture notes:
 *   - Stateless backend: no sessions, no memory caches (RNF003)
 *   - JWT auth enforced per-route via authenticate middleware (RNF001)
 *   - PCI compliance: card data never reaches this server (RNF011)
 * ===========================
 */

import 'dotenv/config';           // Must be first — loads .env before any other import
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { disconnectDb } from './config/database';
import { globalErrorHandler } from './middlewares/error.middleware';
import { startScheduledTasks } from './utils/tasks.utils';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import apiRoutes from './routes/index';

const app = express();

// ---- Security Middleware ----

// helmet adds security-related HTTP headers (XSS protection, HSTS, etc.)
app.use(helmet());

// CORS — only allow configured origins (iOS app, local dev)
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting — protects auth endpoints from brute force (RNF001)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // Max 20 login attempts per window per IP
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- Logging ----
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// ---- Raw body parsing for Stripe webhook (must be BEFORE express.json) ----
// Stripe requires the raw unmodified body to verify webhook signatures
app.use(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' })
);

// ---- JSON body parsing ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- API Docs (Swagger UI) ----
// Available at: http://localhost:PORT/api/v1/docs
// Disabled in production to avoid exposing internals
if (env.NODE_ENV !== 'production') {
  app.use(
    '/api/v1/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );
}

// ---- Health Check ----
// Used by Docker HEALTHCHECK and Azure App Services probes
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'solo-plantas-api',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ---- API Routes ----
// Apply auth rate limiter specifically to login/register
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Mount all routes under /api/v1
app.use('/api/v1', apiRoutes);

// ---- 404 Fallback ----
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ---- Global Error Handler (must be last middleware) ----
app.use(globalErrorHandler);

// ---- Start Server ----
const server = app.listen(env.PORT, () => {
  console.log(`\n🌿 Solo Plantas API running`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Port:        ${env.PORT}`);
  console.log(`   Health:      http://localhost:${env.PORT}/health`);
  console.log(`   API base:    http://localhost:${env.PORT}/api/v1`);
  if (env.NODE_ENV !== 'production') {
    console.log(`   API Docs:    http://localhost:${env.PORT}/api/v1/docs`);
  }
  console.log();

  // Start background tasks (cart reservation cleanup every 10 minutes)
  startScheduledTasks();
});

// ---- Graceful Shutdown ----
// Ensures in-flight requests complete and DB connections close cleanly
// Critical for Docker/Azure container restarts without data corruption
const shutdown = async (signal: string) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed');
    await disconnectDb();
    console.log('[Server] Database disconnected. Bye! 🌱');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;
