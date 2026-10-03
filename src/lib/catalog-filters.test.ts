import { describe, expect, it } from "vitest";
import { products, isAvailable } from "@/data/products";
import { catalogCollections, filterCatalog, validateCatalogSearch } from "./catalog-filters";
import { collectionFor } from "./collections";
import {
  DEFAULT_CHAT_SIDE,
  CHAT_SIDE_KEY,
  preferredChatSide,
  oppositeSide,
  showFloatingCart,
} from "./floating-widgets";

describe("small catalogue browsing", () => {
  it("shows every model by default, with each model in exactly one landing collection", () => {
    expect(filterCatalog(products, {})).toHaveLength(products.length);
    const grouped = catalogCollections.flatMap((c) =>
      filterCatalog(products, { collection: c.id }),
    );
    expect(new Set(grouped.map((p) => p.id)).size).toBe(products.length);
    expect(grouped).toHaveLength(products.length);
    for (const collection of catalogCollections)
      expect(grouped.some((p) => collectionFor(p) === collection.id)).toBe(true);
  });
  it("finds Romanian text without diacritics and words in any order", () => {
    const matched = filterCatalog(products, { q: "  POTTER cutiuta  " });
    expect(matched.map((p) => p.id)).toContain("hp-keeper");
    expect(matched.every((p) => /Potter/.test(p.name))).toBe(true);
  });
  it("combines search, collection and actual availability without leaking other collections", () => {
    expect(filterCatalog(products, { q: "Harry Potter", collection: "emotion" })).toEqual([]);
    const ready = filterCatalog(products, { available: true });
    expect(ready).toHaveLength(products.filter(isAvailable).length);
    expect(ready.every(isAvailable)).toBe(true);
    const emotion = {
      ...products[0],
      collection: "emotion" as const,
      availability: "out_of_stock" as const,
    };
    expect(filterCatalog([emotion], { collection: "story" })).toEqual([]);
    expect(filterCatalog([emotion], { collection: "emotion" })).toEqual([emotion]);
    expect(filterCatalog([emotion], { available: true })).toEqual([]);
  });
  it("ignores invalid URL filters, preserves typing spaces and bounds the query", () => {
    expect(validateCatalogSearch({ collection: "unknown", available: "false", q: 123 })).toEqual(
      {},
    );
    expect(validateCatalogSearch({ q: "Harry ", collection: "story", available: "true" })).toEqual({
      q: "Harry ",
      collection: "story",
      available: true,
    });
    expect(validateCatalogSearch({ q: "a".repeat(200) }).q).toHaveLength(100);
  });
});

describe("floating cart access", () => {
  it("stays away from landing, empty carts and checkout while remaining accessible on product pages", () => {
    expect(showFloatingCart("/", 1)).toBe(false);
    expect(showFloatingCart("/produse", 0)).toBe(false);
    expect(showFloatingCart("/comanda/", 1)).toBe(false);
    expect(showFloatingCart("/admin/products", 1)).toBe(false);
    expect(showFloatingCart("/produse", 1)).toBe(true);
    expect(showFloatingCart("/produs/hp-keeper", 1)).toBe(true);
  });
  it("starts opposite a left-hand chat and ignores invalid stored preferences", () => {
    expect(DEFAULT_CHAT_SIDE).toBe("left");
    expect(CHAT_SIDE_KEY).not.toBe("cutiuta:chat-side");
    expect(preferredChatSide(null, DEFAULT_CHAT_SIDE)).toBe("left");
    expect(preferredChatSide("invalid", DEFAULT_CHAT_SIDE)).toBe("left");
    expect(oppositeSide(preferredChatSide("right", DEFAULT_CHAT_SIDE))).toBe("left");
  });
  it("follows the opposite edge when the visitor moves the chat", () => {
    expect(oppositeSide("right")).toBe("left");
    expect(oppositeSide("left")).toBe("right");
  });
});
