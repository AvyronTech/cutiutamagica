import { describe, expect, it } from "vitest";
import { normalizeRomanianDisplayText } from "./romanian-text";

describe("normalizeRomanianDisplayText", () => {
  it("converts legacy cedilla glyphs to Romanian comma-below glyphs", () => {
    expect(normalizeRomanianDisplayText("IAŞI, DUMBRĂVIŢA, RĂZEŞILOR")).toBe(
      "IAȘI, DUMBRĂVIȚA, RĂZEȘILOR",
    );
  });

  it("keeps already-correct Romanian text unchanged", () => {
    expect(normalizeRomanianDisplayText("Cutiuța Magică — informații utile")).toBe(
      "Cutiuța Magică — informații utile",
    );
  });
});
