/**
 * src/types/index.ts
 * ===========================
 * Shared TypeScript types and interfaces used across the application.
 * ===========================
 */

import { Request } from 'express';

// ---- JWT Payload ----
// Shape of the decoded token returned by jwt.verify()
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ---- Authenticated Request ----
// Extends Express Request to include the decoded JWT user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ---- API Response shapes ----
// Standard success response wrapper
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// Standard error response wrapper
export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

// ---- Pagination ----
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Shipping Types ----
export type ShippingType = 'delivery' | 'pickup';

// ---- Order Status ----
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'activated';

// ---- Shipping Address (delivery orders) ----
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  references?: string;
}

// ---- Cart Reservation Request ----
export interface ReserveCartRequest {
  plantId: string;
  quantity: number;
}

// ---- Payment Intent Request ----
export interface CreatePaymentIntentRequest {
  orderId: string;
}
