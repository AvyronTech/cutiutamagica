import { describe, expect, it } from "vitest";
import { calculateDisplayedTotals, getVolumeUnitPriceBani } from "@/lib/pricing";

describe("pricing", () => {
  it("keeps the regular price for one music box", () => {
    expect(getVolumeUnitPriceBani(1)).toBeNull();
    expect(calculateDisplayedTotals(1)).toEqual({
      baseSubtotal: 119,
      discount: 0,
      subtotal: 119,
      total: 119,
    });
  });

  it("applies 75 RON per item from two units", () => {
    expect(getVolumeUnitPriceBani(2)).toBe(7_500);
    expect(calculateDisplayedTotals(2)).toEqual({
      baseSubtotal: 238,
      discount: 88,
      subtotal: 150,
      total: 150,
    });
  });

  it("normalizes invalid quantities before display", () => {
    expect(calculateDisplayedTotals(-3).total).toBe(0);
    expect(calculateDisplayedTotals(2.9).total).toBe(150);
  });
});
