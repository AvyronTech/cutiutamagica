import { describe, expect, it } from "vitest";
import { normalizeIban } from "./iban";

describe("IBAN pentru ramburs", () => {
  it("acceptă un IBAN valid și respinge caractere sau cifre de control greșite", () => {
    expect(normalizeIban("ro49 aaaa 1b31 0075 9384 0000")).toBe("RO49AAAA1B31007593840000");
    expect(normalizeIban("RO48AAAA1B31007593840000")).toBeNull();
    expect(normalizeIban("RO49AAAA1B3100759384000")).toBeNull();
  });
});
