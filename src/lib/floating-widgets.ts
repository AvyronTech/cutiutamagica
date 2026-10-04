import { useSyncExternalStore } from "react";

export type WidgetSide = "left" | "right";
export type ChatBubblePosition = { x: number; y: number };
type ChatPlacement = { side: WidgetSide; open: boolean };
export const DEFAULT_CHAT_SIDE: WidgetSide = "left";
// Ignore old bottom-corner preferences after moving the launcher to the middle.
export const CHAT_SIDE_KEY = "cutiuta:chat-side:center-v2";
export const CHAT_POSITION_KEY = "cutiuta:chat-position:v1";
export const CHAT_BUBBLE_SIZE = 44;
export const CHAT_VIEWPORT_MARGIN = 12;

export function parseChatPosition(value: string | null): ChatBubblePosition | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ChatBubblePosition>;
    return Number.isFinite(parsed.x) && Number.isFinite(parsed.y)
      ? { x: Number(parsed.x), y: Number(parsed.y) }
      : null;
  } catch {
    return null;
  }
}

export function clampChatPosition(
  position: ChatBubblePosition,
  viewportWidth: number,
  viewportHeight: number,
  bubbleSize = CHAT_BUBBLE_SIZE,
  margin = CHAT_VIEWPORT_MARGIN,
): ChatBubblePosition {
  const maxX = Math.max(margin, viewportWidth - bubbleSize - margin);
  const maxY = Math.max(margin, viewportHeight - bubbleSize - margin);
  return {
    x: Math.min(maxX, Math.max(margin, position.x)),
    y: Math.min(maxY, Math.max(margin, position.y)),
  };
}

export function preferredChatSide(stored: string | null, configured: WidgetSide): WidgetSide {
  return stored === "left" || stored === "right" ? stored : configured;
}
const initial: ChatPlacement = { side: DEFAULT_CHAT_SIDE, open: false };
let placement = initial;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function publishChatPlacement(next: ChatPlacement) {
  if (placement.side === next.side && placement.open === next.open) return;
  placement = next;
  listeners.forEach((listener) => listener());
}
export const useChatPlacement = () =>
  useSyncExternalStore(
    subscribe,
    () => placement,
    () => initial,
  );
export const oppositeSide = (side: WidgetSide): WidgetSide => (side === "left" ? "right" : "left");
export function showFloatingCart(pathname: string, quantity: number) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    quantity > 0 &&
    path !== "/" &&
    path !== "/comanda" &&
    !/^\/(admin|autentificare)(\/|$)/.test(path)
  );
}
