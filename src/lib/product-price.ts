import type { Product } from "@/data/products";

export function currentPriceBani(product: Pick<Product, "price">): number {
  return Math.max(0, Math.round((product.price ?? 0) * 100));
}

export function referencePriceBani(product: Pick<Product, "price" | "originalPrice">): number {
  const current = currentPriceBani(product);
  const reference = Math.round((product.originalPrice ?? 0) * 100);
  return reference > current ? reference : current;
}

export function productSavingsBani(product: Pick<Product, "price" | "originalPrice">): number {
  return Math.max(0, referencePriceBani(product) - currentPriceBani(product));
}

export function hasProductDiscount(product: Pick<Product, "price" | "originalPrice">): boolean {
  return productSavingsBani(product) > 0;
}

export function calculateProductDiscountTotals(
  lines: ReadonlyArray<{
    product: Pick<Product, "price" | "originalPrice">;
    quantity: number;
  }>,
) {
  const totals = lines.reduce(
    (sum, line) => {
      const quantity = Math.max(0, Math.floor(line.quantity));
      sum.currentSubtotalBani += currentPriceBani(line.product) * quantity;
      sum.referenceSubtotalBani += referencePriceBani(line.product) * quantity;
      return sum;
    },
    { currentSubtotalBani: 0, referenceSubtotalBani: 0 },
  );

  return {
    ...totals,
    productDiscountBani: totals.referenceSubtotalBani - totals.currentSubtotalBani,
  };
}
