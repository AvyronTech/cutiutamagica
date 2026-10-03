import { describe, expect, it } from "vitest";
import {
  cartRecoveryStage,
  GIFT_DISMISS_FOR_MS,
  GIFT_RECOVERY_AFTER_MS,
  parseCartRecoveryState,
  sanitizeGiftList,
  STORY_DISMISS_FOR_MS,
  STORY_RECOVERY_AFTER_MS,
} from "./cart-recovery";

describe("cart recovery timing", () => {
  const now = 2_000_000_000_000;

  it("does not interrupt a fresh shopping session", () => {
    expect(cartRecoveryStage({ lastInteractionAt: now - STORY_RECOVERY_AFTER_MS + 1 }, now)).toBe(
      null,
    );
  });

  it("recovers the story after a short absence", () => {
    expect(cartRecoveryStage({ lastInteractionAt: now - STORY_RECOVERY_AFTER_MS }, now)).toBe(
      "story",
    );
  });

  it("offers the gift list after a longer absence", () => {
    expect(cartRecoveryStage({ lastInteractionAt: now - GIFT_RECOVERY_AFTER_MS }, now)).toBe(
      "gift-list",
    );
  });

  it("respects stage-specific quiet periods", () => {
    expect(
      cartRecoveryStage(
        {
          lastInteractionAt: now - STORY_RECOVERY_AFTER_MS,
          storyDismissedAt: now - STORY_DISMISS_FOR_MS + 1,
        },
        now,
      ),
    ).toBe(null);
    expect(
      cartRecoveryStage(
        {
          lastInteractionAt: now - GIFT_RECOVERY_AFTER_MS,
          giftDismissedAt: now - GIFT_DISMISS_FOR_MS + 1,
        },
        now,
      ),
    ).toBe(null);
  });
});

describe("cart recovery storage", () => {
  it("rejects corrupt metadata", () => {
    expect(parseCartRecoveryState("not-json")).toBe(null);
    expect(parseCartRecoveryState('{"lastInteractionAt":"yesterday"}')).toBe(null);
  });

  it("sanitizes the local gift list", () => {
    expect(sanitizeGiftList('["box-1","box-1",3,"box-2"]')).toEqual(["box-1", "box-2"]);
  });
});
