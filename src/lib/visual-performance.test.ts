import { describe, expect, it } from "vitest";
import { visualEffectsTier } from "./visual-performance";

describe("adaptive visual effects", () => {
  it("keeps the complete visual experience on capable devices", () => {
    expect(visualEffectsTier({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe("full");
  });

  it("simplifies continuous motion on modest devices", () => {
    expect(visualEffectsTier({ deviceMemory: 4, hardwareConcurrency: 8 })).toBe("balanced");
    expect(visualEffectsTier({ hardwareConcurrency: 4 })).toBe("balanced");
    expect(visualEffectsTier({ compactTouch: true, hardwareConcurrency: 8 })).toBe("balanced");
    expect(visualEffectsTier({ compactTouch: true, deviceMemory: 8, hardwareConcurrency: 8 })).toBe(
      "full",
    );
  });

  it("keeps scenes readable without decorative motion when resources are constrained", () => {
    expect(visualEffectsTier({ saveData: true })).toBe("minimal");
    expect(visualEffectsTier({ effectiveType: "2g" })).toBe("minimal");
    expect(visualEffectsTier({ deviceMemory: 2 })).toBe("minimal");
    expect(visualEffectsTier({ reducedMotion: true })).toBe("minimal");
  });
});
