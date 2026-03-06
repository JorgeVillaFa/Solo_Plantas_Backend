/**
 * src/config/database.ts
 * ===========================
 * Prisma client singleton.
 *
 * A single PrismaClient instance is shared across the entire app to avoid
 * exhausting the PostgreSQL connection pool. In development, we attach it to
 * globalThis so hot-reloads (ts-node-dev) don't create new connections on
 * every file save.
 * ===========================
 */

import { PrismaClient } from '@prisma/client';

// In development, reuse the existing client on hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Gracefully closes the Prisma connection pool.
 * Called during server shutdown (SIGTERM / SIGINT).
 */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
