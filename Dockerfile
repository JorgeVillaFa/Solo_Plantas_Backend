# ===========================
# Solo Plantas API — Dockerfile
# Multi-stage build: builder → production
# Base: node:20-alpine for minimal image size (Inf001)
# Runs as non-root user for security
# ===========================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL is required by Prisma's query engine on Alpine Linux
RUN apk add --no-cache openssl

# Copy dependency manifests first to leverage Docker layer cache
# Only reinstalls deps when package.json / lock changes
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL deps (including devDependencies for building + prisma generate)
RUN npm ci

# Copy Prisma schema and generate the client before building
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript → JavaScript
COPY src ./src
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

# OpenSSL is required by Prisma's query engine on Alpine Linux
RUN apk add --no-cache openssl

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy dependency manifests and install ONLY production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (needed for migrate deploy at startup)
COPY prisma ./prisma

# Switch to non-root user
USER appuser

# Expose API port (matches PORT in .env)
EXPOSE 3000

# Health check — ensures the container is actually serving (RNF backend availability)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run migrations then start the server
# In development, use docker-compose which handles this separately
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
