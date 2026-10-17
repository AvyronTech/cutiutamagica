import { describe, expect, it } from "vitest";
import { isAvailable, products } from "@/data/products";
import { calculateProductDiscountTotals, productSavingsBani } from "@/lib/product-price";

describe("product discounts", () => {
  it("keeps the initial current prices and compares them with higher reference prices", () => {
    const available = products.filter(isAvailable);

    expect(available).toHaveLength(5);
    expect(available.map(({ id, price, originalPrice }) => ({ id, price, originalPrice }))).toEqual(
      [
        { id: "hp-keeper", price: 149, originalPrice: 189 },
        { id: "got-winter", price: 149, originalPrice: 189 },
        { id: "kitten", price: 129, originalPrice: 159 },
        { id: "halloween", price: 139, originalPrice: 169 },
        { id: "sunshine", price: 129, originalPrice: 149 },
      ],
    );
    expect(available.map(productSavingsBani)).toEqual([4000, 4000, 3000, 3000, 2000]);
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
      currentSubtotalBani: 44_700,
      referenceSubtotalBani: 56_700,
      productDiscountBani: 12_000,
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
