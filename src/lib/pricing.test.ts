import { describe, expect, it } from "vitest";
import { calculateDisplayedTotals } from "@/lib/pricing";

describe("pricing", () => {
  it("adds up each product at its own price", () => {
    expect(calculateDisplayedTotals([{ unitPriceBani: 14_900, quantity: 1 }])).toEqual({
      subtotal: 149,
      total: 149,
    });
    expect(
      calculateDisplayedTotals([
        { unitPriceBani: 14_900, quantity: 2 },
        { unitPriceBani: 12_900, quantity: 1 },
      ]),
    ).toEqual({ subtotal: 427, total: 427 });
  });

  it("returns zero for an empty cart", () => {
    expect(calculateDisplayedTotals([])).toEqual({ subtotal: 0, total: 0 });
  });

  it("normalizes invalid quantities and prices before display", () => {
    expect(calculateDisplayedTotals([{ unitPriceBani: 12_900, quantity: 2.9 }]).total).toBe(258);
    expect(calculateDisplayedTotals([{ unitPriceBani: -100, quantity: -3 }]).total).toBe(0);
  });
});
