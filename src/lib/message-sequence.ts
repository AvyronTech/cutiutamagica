import type { StorefrontMessage } from "./storefront-messages";
export const MESSAGE_SESSION_LIMIT = 3;
export const MESSAGE_GAP_MS = 18_000;
export type MessageSession = { shown: string[]; muted: boolean };
export function readMessageSession(value: string | null): MessageSession {
  try {
    const data = JSON.parse(value ?? "null");
    if (data && Array.isArray(data.shown) && typeof data.muted === "boolean")
      return {
        shown: data.shown
          .filter((id: unknown): id is string => typeof id === "string")
          .slice(0, MESSAGE_SESSION_LIMIT),
        muted: data.muted,
      };
  } catch {
    /* A blocked or malformed session never prevents browsing. */
  }
  return { shown: [], muted: false };
}
export function nextStorefrontMessage(
  messages: StorefrontMessage[],
  session: MessageSession,
  placement: StorefrontMessage["placement"],
  elapsedSeconds: number,
  scrollPercent: number,
) {
  if (session.muted || session.shown.length >= MESSAGE_SESSION_LIMIT) return undefined;
  return messages
    .filter(
      (m) =>
        m.enabled &&
        m.placement === placement &&
        !session.shown.includes(m.id) &&
        m.delaySeconds <= elapsedSeconds &&
        m.scrollPercent <= scrollPercent,
    )
    .sort((a, b) => a.delaySeconds - b.delaySeconds || a.id.localeCompare(b.id))[0];
}
