/*
 * src/utils.ts
 * ===========================
 * Shared utility functions used in services.
 * ===========================
 */

/*
 * Converts price from MXN cents (Int) to pesos (Double) for iOS.
 * Returns null if priceActive is false.
*/
export function serializePrice(price: number, priceActive: boolean): number | null {
  return priceActive ? price / 100 : null;
}