import { describe, expect, it } from "vitest";
import { returnRequestInputSchema } from "@/lib/commerce-operations-contracts";
import { constantTimeEqual, digestHex } from "@/server/integrations/provider-runtime";

const returnRequest = {
  website: "",
  orderNumber: "CM-20260915-TEST",
  customerName: "Ana Popescu",
  email: "ana@example.com",
  phone: "",
  requestType: "withdrawal" as const,
  preferredResolution: "refund" as const,
  reason: "Drept de retragere",
  details: "",
  policyAccepted: true as const,
};

describe("commerce operations contracts", () => {
  it("accepts the electronic return form without an optional phone", () => {
    expect(returnRequestInputSchema.safeParse(returnRequest).success).toBe(true);
  });

  it("requires explicit policy consent", () => {
    expect(
      returnRequestInputSchema.safeParse({ ...returnRequest, policyAccepted: false }).success,
    ).toBe(false);
  });

  it("provides deterministic hashes and constant-time comparisons", async () => {
    const hash = await digestHex("SHA-256", "cutiuta-magica");
    expect(hash).toHaveLength(64);
    expect(constantTimeEqual(hash, hash)).toBe(true);
    const changed = `${hash.slice(0, -1)}${hash.endsWith("0") ? "1" : "0"}`;
    expect(constantTimeEqual(hash, changed)).toBe(false);
  });
});
