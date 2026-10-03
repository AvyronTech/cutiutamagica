import { describe, expect, it } from "vitest";
import { isAvailable, products } from "@/data/products";
import { calculateProductDiscountTotals, productSavingsBani } from "@/lib/product-price";

describe("product discounts", () => {
  it("keeps every available product within the approved 20–45 lei reduction", () => {
    const available = products.filter(isAvailable);

    expect(available).toHaveLength(5);
    for (const product of available) {
      expect(product.originalPrice).toBeGreaterThan(product.price ?? 0);
      expect(productSavingsBani(product)).toBeGreaterThanOrEqual(2_000);
      expect(productSavingsBani(product)).toBeLessThanOrEqual(4_500);
    }
  });

  it("calculates product savings without subtracting them twice from the cart total", () => {
    const hp = products.find((product) => product.id === "hp-keeper")!;
    const winter = products.find((product) => product.id === "got-winter")!;

    expect(
      calculateProductDiscountTotals([
        { product: hp, quantity: 2 },
        { product: winter, quantity: 1 },
      ]),
    ).toEqual({
      currentSubtotalBani: 34_700,
      referenceSubtotalBani: 44_700,
      productDiscountBani: 10_000,
    });
  });

  it("normalizes invalid quantities", () => {
    const product = products.find((candidate) => candidate.id === "sunshine")!;
    expect(calculateProductDiscountTotals([{ product, quantity: -2 }])).toEqual({
      currentSubtotalBani: 0,
      referenceSubtotalBani: 0,
      productDiscountBani: 0,
    });
  });
});
