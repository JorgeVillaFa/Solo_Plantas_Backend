/**
 * src/utils/price.utils.ts
 * ===========================
 * Price serialization for API responses.
 * ===========================
 */

/**
 * Converts price from MXN cents (Int) to pesos (Double) for iOS.
 * Returns null if priceActive is false.
*/
export function serializePrice(price: number, priceActive: boolean): number | null {
  return priceActive ? price / 100 : null;
}