export const GROWTH_EVENT_NAMES = [
  "page_view",
  "product_view",
  "gift_finder_started",
  "gift_finder_completed",
  "audio_play",
  "audio_75",
  "gallery_open",
  "personalization_start",
  "add_to_cart",
  "gift_wrap_added",
  "checkout_start",
  "checkout_abandon",
  "purchase",
  "review_submitted",
  "waitlist_joined",
] as const;

export type GrowthEventName = (typeof GROWTH_EVENT_NAMES)[number];
type PropertyValue = string | number | boolean;
type GrowthEventOptions = {
  productSlug?: string;
  value?: number;
  quantity?: number;
  properties?: Record<string, PropertyValue>;
  once?: string;
  beacon?: boolean;
};

const SESSION_KEY = "cm_growth_session_v1";
const ONCE_PREFIX = "cm_growth_once:";

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function trackGrowthEvent(name: GrowthEventName, options: GrowthEventOptions = {}): void {
  if (typeof window === "undefined") return;
  if (options.once) {
    try {
      const key = `${ONCE_PREFIX}${options.once}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Telemetry remains best-effort when storage is restricted. */
    }
  }
  const payload = JSON.stringify({
    name,
    sessionId: sessionId(),
    productSlug: options.productSlug,
    path: window.location.pathname,
    value: options.value,
    quantity: options.quantity,
    properties: options.properties,
  });
  if (options.beacon && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/v1/growth/events",
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/v1/growth/events", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: payload,
  }).catch(() => undefined);
}
