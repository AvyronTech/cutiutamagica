import { describe, it, expect } from "vitest";
import {
  analyticsPeriod,
  eventLabels,
  eventRatio,
  readAnalyticsSearch,
  readFinanceSearch,
} from "./analytics-report";
import { GROWTH_EVENT_NAMES } from "./growth-events";
import { adminNotificationLink } from "./admin-notification-link";
describe("unified analytics report", () => {
  it("retains only supported tabs and periods", () => {
    expect(readAnalyticsSearch({ tab: "traffic", days: "90" })).toEqual({
      tab: "traffic",
      days: 90,
    });
    expect(readAnalyticsSearch({ tab: "//outside.test", days: "0;DELETE" })).toEqual({
      tab: "overview",
      days: 30,
    });
    expect(readAnalyticsSearch({ days: 100000 })).toEqual({ tab: "overview", days: 30 });
  });
  it("keeps the financial report on the same period with a separate currency", () => {
    expect(readFinanceSearch({ days: "7", currency: "EUR" })).toEqual({ days: 7, currency: "EUR" });
    expect(readFinanceSearch({ days: "bad", currency: "<script>" })).toEqual({
      days: 30,
      currency: "RON",
    });
  });
  it("uses inclusive UTC calendar days across a year boundary", () => {
    expect(analyticsPeriod(7, new Date("2027-01-02T23:59:59Z"))).toEqual({
      startDay: "2026-12-27",
      endDay: "2027-01-02",
      from: "2026-12-27T00:00:00.000Z",
      until: "2027-01-03T00:00:00.000Z",
    });
  });
  it("does not claim a percentage when its denominator is absent", () => {
    expect(eventRatio(0, 0)).toBeNull();
    expect(eventRatio(2, 100)).toBe(2);
  });
  it("has a Romanian label for every recorded event", () => {
    for (const name of GROWTH_EVENT_NAMES) {
      expect(eventLabels[name]).toBeTruthy();
      expect(eventLabels[name]).not.toContain("_");
    }
  });
  it("redirects legacy traffic notifications with the selected period", () => {
    expect(adminNotificationLink("/admin/traffic?days=90")).toBe(
      "/admin/statistics?tab=traffic&days=90",
    );
    expect(adminNotificationLink("/admin/traffic?tab=sources&days=7")).toBe(
      "/admin/statistics?tab=sources&days=7",
    );
  });
});
