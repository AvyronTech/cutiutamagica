export const STORE_CURRENCY = "RON";
/** Prețul folosit când un produs nu are unul propriu în catalog. */
export const PRODUCT_BASE_PRICE_BANI = 11_900;
export const MAX_ITEM_QUANTITY = 5;
export const MAX_CART_QUANTITY = 40;

export type DisplayedLine = { unitPriceBani: number; quantity: number };

/**
 * Totalul afișat în coș, calculat din prețul fiecărui produs.
 * Este doar pentru afișare: suma finală, transportul și orice reducere
 * rămân stabilite de server la checkout.
 */
export function calculateDisplayedTotals(lines: ReadonlyArray<DisplayedLine>) {
  const subtotalBani = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Math.floor(line.quantity));
    const unit = Math.max(0, Math.round(line.unitPriceBani));
    return sum + quantity * unit;
  }, 0);

  return { subtotal: subtotalBani / 100, total: subtotalBani / 100 };
}
