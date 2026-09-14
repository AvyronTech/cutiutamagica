import { describe, expect, it } from "vitest";
import {
  canTransitionOrderStatus,
  toAdminOrderStatus,
  toStoredOrderState,
} from "@/lib/order-status";

describe("order status", () => {
  it("maps stored states to the admin workflow", () => {
    expect(toAdminOrderStatus({ orderStatus: "pending", fulfillmentStatus: "unfulfilled" })).toBe(
      "Nouă",
    );
    expect(toAdminOrderStatus({ orderStatus: "processing", fulfillmentStatus: "packed" })).toBe(
      "Procesare",
    );
    expect(toAdminOrderStatus({ orderStatus: "completed", fulfillmentStatus: "delivered" })).toBe(
      "Livrată",
    );
  });

  it("rejects backward and terminal transitions", () => {
    expect(canTransitionOrderStatus("Nouă", "Procesare")).toBe(true);
    expect(canTransitionOrderStatus("Expediată", "Procesare")).toBe(false);
    expect(canTransitionOrderStatus("Anulată", "Procesare")).toBe(false);
  });

  it("preserves fulfillment state when cancelling", () => {
    expect(
      toStoredOrderState("Anulată", {
        orderStatus: "processing",
        fulfillmentStatus: "packed",
      }),
    ).toEqual({ orderStatus: "cancelled", fulfillmentStatus: "packed" });
  });
});
