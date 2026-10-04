import { describe, expect, it } from "vitest";
import { nextStorefrontMessage, readMessageSession } from "./message-sequence";
import type { StorefrontMessage } from "./storefront-messages";
const message = (
  id: string,
  delaySeconds: number,
  extra: Partial<StorefrontMessage> = {},
): StorefrontMessage => ({
  id,
  title: "O poveste",
  message: "Un dar cu poveste.",
  placement: "home",
  link: "/produse",
  label: "Descoperă",
  delaySeconds,
  scrollPercent: 0,
  enabled: 1,
  version: 1,
  ...extra,
});
const messages = [message("third", 48), message("first", 8), message("second", 26)];
describe("contextual message sequence", () => {
  it("waits for each delay and chooses a deterministic order independent of API order", () => {
    const session = { shown: [], muted: false };
    expect(nextStorefrontMessage(messages, session, "home", 7, 100)).toBeUndefined();
    expect(nextStorefrontMessage(messages, session, "home", 60, 0)?.id).toBe("first");
    expect(
      nextStorefrontMessage(messages, { shown: ["first"], muted: false }, "home", 26, 0)?.id,
    ).toBe("second");
  });
  it("does not repeat messages after refresh or show more than three across pages", () => {
    const session = readMessageSession('{"shown":["first","second","third"],"muted":false}');
    expect(
      nextStorefrontMessage([message("fourth", 8)], session, "home", 120, 100),
    ).toBeUndefined();
    expect(
      nextStorefrontMessage(messages, { shown: ["first"], muted: false }, "home", 8, 0),
    ).toBeUndefined();
  });
  it("honors dismissal, enabled state, current page and scroll thresholds", () => {
    expect(
      nextStorefrontMessage(messages, { shown: [], muted: true }, "home", 120, 100),
    ).toBeUndefined();
    const choices = [
      message("disabled", 8, { enabled: 0 }),
      message("other-page", 8, { placement: "products" }),
      message("scroll", 8, { scrollPercent: 25 }),
    ];
    expect(
      nextStorefrontMessage(choices, { shown: [], muted: false }, "home", 120, 24),
    ).toBeUndefined();
    expect(nextStorefrontMessage(choices, { shown: [], muted: false }, "home", 120, 25)?.id).toBe(
      "scroll",
    );
  });
  it("tolerates unavailable or malformed session storage and bounds restored data", () => {
    for (const input of [null, "bad", '{"shown":{}}', '{"shown":[],"muted":"false"}'])
      expect(readMessageSession(input)).toEqual({ shown: [], muted: false });
    expect(readMessageSession('{"shown":[12,"a","b","c","d"],"muted":true}')).toEqual({
      shown: ["a", "b", "c"],
      muted: true,
    });
  });
});
