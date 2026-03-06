/**
 * src/config/env.ts
 * ===========================
 * Environment variable validation — fails fast on startup if required vars are missing.
 * Import this AFTER dotenv/config has been called (index.ts loads it first).
 *
 * All env access in the app should go through this module, never process.env directly.
 * ===========================
 */

// Helper: reads env var and throws if missing
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value;
}

// Helper: reads env var with a default fallback
function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  // ---- Server ----
  NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(optional('PORT', '3000'), 10),

  // ---- Database ----
  DATABASE_URL: required('DATABASE_URL'),

  // ---- Authentication ----
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'), // Access token lifetime

  // ---- CORS ----
  // Comma-separated list of allowed origins. e.g. "http://localhost:3001,myapp://*"
  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),

  // ---- Stripe (Payments) ----
  STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY', ''),       // sk_test_...
  STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET', ''), // whsec_...

  // ---- OpenWeather API (Climate recommendations) ----
  OPENWEATHER_API_KEY: optional('OPENWEATHER_API_KEY', ''),

  // ---- Cart Reservations ----
  // How long (in minutes) cart reservations are held before being released
  CART_RESERVATION_MINUTES: parseInt(optional('CART_RESERVATION_MINUTES', '10'), 10),
};

export type Env = typeof env;
