import { useSyncExternalStore } from "react";

export type WidgetSide = "left" | "right";
type ChatPlacement = { side: WidgetSide; open: boolean };
export const DEFAULT_CHAT_SIDE: WidgetSide = "left";
// Ignore old bottom-corner preferences after moving the launcher to the middle.
export const CHAT_SIDE_KEY = "cutiuta:chat-side:center-v2";
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
