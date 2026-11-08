import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsAllowed,
  CONSENT_STORAGE_KEY,
  parseConsent,
  readConsent,
  saveConsent,
  subscribeConsent,
} from "./cookie-consent";
import { trackGrowthEvent } from "./growth-events";
import { metricoolPageviewUrl } from "./metricool-pageview";

class Storage {
  values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
let storage: Storage, session: Storage;
beforeEach(() => {
  storage = new Storage();
  session = new Storage();
  const target = new EventTarget();
  vi.stubGlobal(
    "window",
    Object.assign(target, {
      localStorage: storage,
      sessionStorage: session,
      location: { pathname: "/produse" },
    }),
  );
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  // Clear the in-memory fallback through the same storage notification as a second tab.
  const unsubscribe = subscribeConsent(() => {});
  target.dispatchEvent(Object.assign(new Event("storage"), { key: CONSENT_STORAGE_KEY }));
  unsubscribe();
});
afterEach(() => vi.unstubAllGlobals());

describe("optional analytics consent", () => {
  it("fails closed for missing, malformed or partial choices", () => {
    for (const raw of [
      null,
      "{}",
      "null",
      "broken",
      JSON.stringify({ experience: true }),
      JSON.stringify({ necessary: true, experience: true, marketing: false, savedAt: "invalid" }),
    ])
      expect(parseConsent(raw)).toBeNull();
    trackGrowthEvent("page_view", { once: "page_view:/produse" });
    expect(fetch).not.toHaveBeenCalled();
    expect(session.length).toBe(0);
  });
  it("sends once only after explicit permission, and stops and clears analytics identifiers on withdrawal", () => {
    saveConsent({ necessary: true, experience: true, marketing: false });
    trackGrowthEvent("page_view", { once: "page_view:/produse" });
    trackGrowthEvent("page_view", { once: "page_view:/produse" });
    expect(fetch).toHaveBeenCalledTimes(1);
    session.setItem("cart", "retained");
    saveConsent({ necessary: true, experience: false, marketing: false });
    trackGrowthEvent("add_to_cart");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(session.getItem("cm_growth_session_v1")).toBeNull();
    expect(session.getItem("cm_growth_once:page_view:/produse")).toBeNull();
    expect(session.getItem("cart")).toBe("retained");
  });
  it("honors a choice for the current visit when localStorage is blocked", () => {
    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        experience: false,
        marketing: false,
        savedAt: new Date().toISOString(),
      }),
    );
    storage.setItem = () => {
      throw new Error("blocked");
    };
    saveConsent({ necessary: true, experience: true, marketing: false });
    expect(analyticsAllowed()).toBe(true);
    saveConsent({ necessary: true, experience: false, marketing: false });
    expect(analyticsAllowed()).toBe(false);
  });
  it("synchronizes withdrawal from another tab and unsubscribes listeners", () => {
    saveConsent({ necessary: true, experience: true, marketing: false });
    const changed = vi.fn(),
      unsubscribe = subscribeConsent(changed);
    storage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(Object.assign(new Event("storage"), { key: CONSENT_STORAGE_KEY }));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(readConsent()).toBeNull();
    unsubscribe();
    saveConsent({ necessary: true, experience: false, marketing: false });
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it("keeps private pages, local staging, query tokens and referrer paths out of Metricool", () => {
    for (const path of ["/cont", "/auth", "/admin/orders", "/comanda"])
      expect(metricoolPageviewUrl(`https://cutiutamagica.eu${path}`, "", 320, 900)).toBeNull();
    expect(metricoolPageviewUrl("http://localhost:8088/produse", "", 320, 900)).toBeNull();
    const url = new URL(
      metricoolPageviewUrl(
        "https://cutiutamagica.eu/produse?token=private#secret",
        "https://source.example/path?email=private",
        320,
        900,
      )!,
    );
    expect(url.searchParams.get("u")).toBe("https://cutiutamagica.eu/produse");
    expect(url.searchParams.get("ref")).toBe("https://source.example");
    expect(url.href).not.toContain("private");
    expect(url.href).not.toContain("secret");
  });
});
