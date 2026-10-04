import { describe, expect, it } from "vitest";
import {
  decayVelocity,
  easeInOutCubic,
  nearestLoaded,
  positionFromDrag,
  wrapFrame,
} from "@/lib/spin";

describe("wrapFrame", () => {
  it("keeps indexes inside the circle in both directions", () => {
    expect(wrapFrame(0, 36)).toBe(0);
    expect(wrapFrame(36, 36)).toBe(0);
    expect(wrapFrame(-1, 36)).toBe(35);
    expect(wrapFrame(-37, 36)).toBe(35);
    expect(wrapFrame(73, 36)).toBe(1);
  });

  it("preserves fractional positions for smooth inertia", () => {
    expect(wrapFrame(-0.5, 36)).toBeCloseTo(35.5);
  });

  it("does not divide by zero on an empty sequence", () => {
    expect(wrapFrame(5, 0)).toBe(0);
  });
});

describe("positionFromDrag", () => {
  it("maps one full viewer width to one full rotation, whatever the frame count", () => {
    expect(positionFromDrag(0, 400, 400, 36)).toBeCloseTo(0);
    expect(positionFromDrag(0, 200, 400, 36)).toBeCloseTo(18);
    expect(positionFromDrag(0, 200, 400, 72)).toBeCloseTo(36);
  });

  it("rotates backwards when dragging left and wraps around", () => {
    expect(positionFromDrag(0, -100, 400, 36)).toBeCloseTo(27);
  });

  it("ignores a zero-width viewer instead of producing Infinity", () => {
    expect(positionFromDrag(3, 50, 0, 36)).toBe(3);
  });
});

describe("nearestLoaded", () => {
  it("returns the requested frame when it is ready", () => {
    expect(nearestLoaded(4, [true, true, true, true, true])).toBe(4);
  });

  it("falls back to the closest ready neighbour", () => {
    const loaded = [true, false, false, false, false, false, true, false];
    expect(nearestLoaded(5, loaded)).toBe(6);
    expect(nearestLoaded(2, loaded)).toBe(0);
  });

  it("searches across the wrap point", () => {
    const loaded = [false, false, false, false, false, false, false, true];
    expect(nearestLoaded(0, loaded)).toBe(7);
  });

  it("reports -1 when nothing is loaded yet", () => {
    expect(nearestLoaded(3, [false, false, false])).toBe(-1);
  });
});

describe("decayVelocity", () => {
  it("slows down over time and snaps to rest", () => {
    const after = decayVelocity(30, 0.5);
    expect(Math.abs(after)).toBeLessThan(30);
    expect(decayVelocity(0.4, 0.016)).toBe(0);
  });

  it("is frame-rate independent", () => {
    const oneStep = decayVelocity(20, 0.1);
    let twoSteps = decayVelocity(20, 0.05);
    twoSteps = decayVelocity(twoSteps, 0.05);
    expect(twoSteps).toBeCloseTo(oneStep, 5);
  });
});

describe("easeInOutCubic", () => {
  it("starts at 0, ends at 1, passes through the middle", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});
