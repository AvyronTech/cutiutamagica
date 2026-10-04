export const CART_RECOVERY_STORAGE_KEY = "cm_cart_recovery_v1";
export const GIFT_LIST_STORAGE_KEY = "cm_gift_list_v1";

export const STORY_RECOVERY_AFTER_MS = 2 * 60 * 60 * 1_000;
export const GIFT_RECOVERY_AFTER_MS = 72 * 60 * 60 * 1_000;
export const STORY_DISMISS_FOR_MS = 24 * 60 * 60 * 1_000;
export const GIFT_DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1_000;

export type CartRecoveryStage = "story" | "gift-list" | null;

export type CartRecoveryState = {
  lastInteractionAt: number;
  storyDismissedAt?: number;
  giftDismissedAt?: number;
};

export function parseCartRecoveryState(raw: string | null): CartRecoveryState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== "object" ||
      !("lastInteractionAt" in value) ||
      typeof value.lastInteractionAt !== "number" ||
      !Number.isFinite(value.lastInteractionAt) ||
      value.lastInteractionAt <= 0
    )
      return null;
    const state = value as Record<string, unknown>;
    return {
      lastInteractionAt: value.lastInteractionAt,
      storyDismissedAt:
        typeof state.storyDismissedAt === "number" && Number.isFinite(state.storyDismissedAt)
          ? state.storyDismissedAt
          : undefined,
      giftDismissedAt:
        typeof state.giftDismissedAt === "number" && Number.isFinite(state.giftDismissedAt)
          ? state.giftDismissedAt
          : undefined,
    };
  } catch {
    return null;
  }
}

export function cartRecoveryStage(state: CartRecoveryState | null, now: number): CartRecoveryStage {
  if (!state || !Number.isFinite(now) || now < state.lastInteractionAt) return null;
  const age = now - state.lastInteractionAt;
  if (age >= GIFT_RECOVERY_AFTER_MS) {
    const dismissedRecently =
      state.giftDismissedAt != null && now - state.giftDismissedAt < GIFT_DISMISS_FOR_MS;
    return dismissedRecently ? null : "gift-list";
  }
  if (age >= STORY_RECOVERY_AFTER_MS) {
    const dismissedRecently =
      state.storyDismissedAt != null && now - state.storyDismissedAt < STORY_DISMISS_FOR_MS;
    return dismissedRecently ? null : "story";
  }
  return null;
}

export function sanitizeGiftList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 160)
      .filter((id, index, items) => items.indexOf(id) === index)
      .slice(0, 40);
  } catch {
    return [];
  }
}
