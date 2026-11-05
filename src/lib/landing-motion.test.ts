import { describe, expect, it } from "vitest";
import { isIntentionalPress, worldBlend } from "./landing-motion";
describe("continuous landing scenes", () => {
  it("holds the first scene before a boundary enters the viewing area", () => {
    expect(worldBlend([{ index: 1, top: 1000, ready: true }], 1000)).toEqual({
      base: 0,
      overlay: -1,
      progress: 0,
    });
  });
  it("blends adjacent scenes halfway and then replaces the base", () => {
    expect(worldBlend([{ index: 1, top: 500, ready: true }], 1000)).toEqual({
      base: 0,
      overlay: 1,
      progress: 0.5,
    });
    expect(worldBlend([{ index: 1, top: 220, ready: true }], 1000)).toEqual({
      base: 1,
      overlay: -1,
      progress: 0,
    });
  });
  it("supports deep links, rapid scrolling and reversing without retaining old scenes", () => {
    expect(
      worldBlend(
        [
          { index: 1, top: -2000, ready: true },
          { index: 2, top: -900, ready: true },
          { index: 3, top: 500, ready: true },
        ],
        1000,
      ),
    ).toEqual({ base: 2, overlay: 3, progress: 0.5 });
    expect(
      worldBlend(
        [
          { index: 1, top: 500, ready: true },
          { index: 2, top: 1600, ready: true },
        ],
        1000,
      ),
    ).toEqual({ base: 0, overlay: 1, progress: 0.5 });
  });
  it("keeps a ready scene visible while another image is loading or failed", () => {
    expect(
      worldBlend(
        [
          { index: 1, top: -300, ready: true },
          { index: 2, top: 0, ready: false },
          { index: 3, top: 1200, ready: true },
        ],
        1000,
      ),
    ).toEqual({ base: 1, overlay: -1, progress: 0 });
    expect(worldBlend([], 0)).toEqual({ base: 0, overlay: -1, progress: 0 });
  });
});
describe("decorative press feedback", () => {
  it("accepts a tap or keyboard activation, and ignores swipe movement", () => {
    expect(isIntentionalPress({ x: 100, y: 100 }, { x: 103, y: 104 }, false)).toBe(true);
    expect(isIntentionalPress({ x: 100, y: 100 }, { x: 180, y: 105 }, false)).toBe(false);
    expect(isIntentionalPress(null, { x: 0, y: 0 }, true)).toBe(true);
    expect(isIntentionalPress(null, { x: 100, y: 100 }, false)).toBe(false);
  });
});
