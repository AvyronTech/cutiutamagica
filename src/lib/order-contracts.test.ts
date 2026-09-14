import { describe, expect, it } from "vitest";
import { websiteOrderInputSchema } from "@/lib/order-contracts";

const validOrder = {
  idempotencyKey: "451d3866-7fa5-4be2-b696-0ddad594713f",
  website: "",
  customer: {
    name: "Ana Popescu",
    phone: "0712345678",
    address: "Strada Poveștii 10",
    city: "București",
    notes: "",
  },
  items: [{ productId: "hp-keeper", quantity: 2 }],
};

describe("website order contract", () => {
  it("accepts a valid music-box order", () => {
    expect(websiteOrderInputSchema.safeParse(validOrder).success).toBe(true);
  });

  it("rejects the honeypot field", () => {
    expect(websiteOrderInputSchema.safeParse({ ...validOrder, website: "spam" }).success).toBe(
      false,
    );
  });

  it("rejects excessive per-item and cart quantities", () => {
    expect(
      websiteOrderInputSchema.safeParse({
        ...validOrder,
        items: [{ productId: "hp-keeper", quantity: 6 }],
      }).success,
    ).toBe(false);
    expect(
      websiteOrderInputSchema.safeParse({
        ...validOrder,
        items: Array.from({ length: 9 }, (_, index) => ({
          productId: `product-${index}`,
          quantity: 5,
        })),
      }).success,
    ).toBe(false);
  });
});
