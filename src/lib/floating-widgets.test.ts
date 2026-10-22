import { describe, expect, it } from "vitest";
import { clampChatPosition, parseChatPosition } from "./floating-widgets";

describe("floating chat placement", () => {
  it("accepts only finite persisted coordinates", () => {
    expect(parseChatPosition('{"x":120,"y":300}')).toEqual({ x: 120, y: 300 });
    expect(parseChatPosition('{"x":"120","y":300}')).toBeNull();
    expect(parseChatPosition('{"x":null,"y":300}')).toBeNull();
    expect(parseChatPosition("invalid")).toBeNull();
  });

  it("keeps the bubble entirely inside desktop and mobile viewports", () => {
    expect(clampChatPosition({ x: -40, y: 900 }, 390, 844)).toEqual({ x: 12, y: 788 });
    expect(clampChatPosition({ x: 240, y: 350 }, 1280, 720)).toEqual({ x: 240, y: 350 });
    expect(clampChatPosition({ x: 1300, y: -20 }, 1280, 720)).toEqual({ x: 1224, y: 12 });
  });
});
