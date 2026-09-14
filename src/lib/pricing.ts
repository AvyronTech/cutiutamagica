export const STORE_CURRENCY = "RON";
export const PRODUCT_BASE_PRICE_BANI = 11_900;
export const VOLUME_PRICE_BANI = 7_500;
export const MAX_ITEM_QUANTITY = 5;
export const MAX_CART_QUANTITY = 40;

export function getVolumeUnitPriceBani(totalQuantity: number): number | null {
  return totalQuantity >= 2 ? VOLUME_PRICE_BANI : null;
}

export function calculateDisplayedTotals(totalQuantity: number) {
  const safeQuantity = Math.max(0, Math.floor(totalQuantity));
  const baseSubtotalBani = safeQuantity * PRODUCT_BASE_PRICE_BANI;
  const unitPriceBani = getVolumeUnitPriceBani(safeQuantity) ?? PRODUCT_BASE_PRICE_BANI;
  const subtotalBani = safeQuantity * unitPriceBani;

  return {
    baseSubtotal: baseSubtotalBani / 100,
    discount: (baseSubtotalBani - subtotalBani) / 100,
    subtotal: subtotalBani / 100,
    total: subtotalBani / 100,
  };
}
