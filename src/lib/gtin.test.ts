import { describe, expect, it } from "vitest";
import { isValidGtin } from "./gtin";

describe("GS1 product identifier", () => {
  it("accepts valid GTIN lengths and checks the final digit", () => {
    expect(isValidGtin("96385074")).toBe(true);
    expect(isValidGtin("012345678905")).toBe(true);
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("04006381333931")).toBe(true);
    expect(isValidGtin("4006381333932")).toBe(false);
    expect(isValidGtin("123456789")).toBe(false);
  });
});
