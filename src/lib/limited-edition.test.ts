import { describe, expect, it } from "vitest";
import { productLimitedEdition, products } from "@/data/products";

describe("limited product editions", () => {
  it("marks only the two selected special collections", () => {
    expect(
      products.filter((product) => product.limitedEdition).map((product) => product.id),
    ).toEqual(["hp-keeper", "got-winter"]);
  });

  it("describes a 120-piece series without treating it as remaining stock", () => {
    expect(productLimitedEdition("hp-keeper")).toEqual({ totalUnits: 120 });
    expect(productLimitedEdition("got-winter")).toEqual({ totalUnits: 120 });
    expect(productLimitedEdition("sunshine")).toBeUndefined();
  });
});
