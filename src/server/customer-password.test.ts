import { describe, expect, it, vi } from "vitest";
import { hashCustomerPassword, verifyCustomerPassword } from "./customer-password";
import { pbkdf2 } from "node:crypto";

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  return { ...original, pbkdf2: vi.fn(original.pbkdf2) };
});

describe("customer password Worker compatibility", () => {
  it("preserves existing hashes when production also rejects Node PBKDF2", async () => {
    const native = vi.mocked(pbkdf2);
    native.mockImplementationOnce((_password, _salt, _iterations, _length, _digest, callback) => {
      callback(
        new Error("Pbkdf2 failed: iteration counts above 100000 are not supported"),
        Buffer.alloc(0),
      );
    });
    expect(
      await verifyCustomerPassword(
        "fixture-password-2026",
        "pbkdf2-sha256:210000:66eb3717fa1f4f33cd79ba040b8b769f5960bdf86b9b5097b5bd41b99bcb2953",
        "0123456789abcdef",
      ),
    ).toBe(true);
  });
  it("verifies existing 210,000-iteration hashes without the limited SubtleCrypto API", async () => {
    const limited = vi
      .spyOn(crypto.subtle, "deriveBits")
      .mockRejectedValue(new Error("iteration counts above 100000 are not supported"));
    try {
      expect(
        await verifyCustomerPassword(
          "fixture-password-2026",
          "pbkdf2-sha256:210000:66eb3717fa1f4f33cd79ba040b8b769f5960bdf86b9b5097b5bd41b99bcb2953",
          "0123456789abcdef",
        ),
      ).toBe(true);
      expect(
        await verifyCustomerPassword(
          "wrong-password",
          "pbkdf2-sha256:210000:66eb3717fa1f4f33cd79ba040b8b769f5960bdf86b9b5097b5bd41b99bcb2953",
          "0123456789abcdef",
        ),
      ).toBe(false);
      expect(limited).not.toHaveBeenCalled();
    } finally {
      limited.mockRestore();
    }
  });
  it("keeps the stored format and unique salts for new customer passwords", async () => {
    const a = await hashCustomerPassword("fixture-password-2026");
    const b = await hashCustomerPassword("fixture-password-2026");
    expect(a.hash).toMatch(/^pbkdf2-sha256:210000:[a-f0-9]{64}$/);
    expect(a.salt).not.toBe(b.salt);
    expect(await verifyCustomerPassword("fixture-password-2026", a.hash, a.salt)).toBe(true);
    expect(await verifyCustomerPassword("fixture-password-2026", "malformed", a.salt)).toBe(false);
  });
});
