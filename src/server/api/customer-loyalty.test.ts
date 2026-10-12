import { afterEach, describe, expect, it, vi } from "vitest";
import { handleCustomerLoyalty } from "./customer-loyalty";

vi.mock("../review-accounts", () => ({
  currentReviewer: vi.fn(async () => ({ id: "customer-test" })),
  reviewJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));

vi.mock("../services/magic-rewards", () => ({
  CustomerRewardError: class CustomerRewardError extends Error {},
  magicRewardsDashboard: vi.fn(async () => {
    throw new Error("D1 internal table name and connection detail");
  }),
}));

afterEach(() => vi.restoreAllMocks());

describe("customer API error boundary", () => {
  it("does not expose internal database errors to the customer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleCustomerLoyalty(
      new Request("https://store.example/api/v1/customer/rewards"),
      {} as Env,
    );
    expect(response?.status).toBe(500);
    const body = await response!.text();
    expect(body).toContain("Operația nu este disponibilă momentan");
    expect(body).not.toContain("D1 internal");
  });
});
