import { describe, expect, it } from "vitest";
import {
  metricoolScheduleReconciliationSchema,
  socialSnapshotSchema,
} from "./social-dashboard-contracts";

const sample = {
  network: "facebook" as const,
  periodStart: "2026-09-20",
  periodEnd: "2026-10-18",
  followersObservedOn: "2026-10-18",
  followers: 227,
  posts: 3,
  views: 691,
  interactions: 43,
  reels: null,
};

describe("Metricool snapshot validation", () => {
  it("accepts a dated report while preserving unavailable metrics as null", () => {
    const parsed = socialSnapshotSchema.parse(sample);
    expect(parsed.reels).toBeNull();
    expect(parsed.followers).toBe(227);
  });

  it("rejects invalid periods and follower dates outside the report", () => {
    expect(socialSnapshotSchema.safeParse({ ...sample, periodEnd: "2026-10-20" }).success).toBe(
      false,
    );
    expect(socialSnapshotSchema.safeParse({ ...sample, periodStart: "2026-02-30" }).success).toBe(
      false,
    );
    expect(
      socialSnapshotSchema.safeParse({ ...sample, followersObservedOn: "2026-10-19" }).success,
    ).toBe(false);
  });

  it("requires an observed metric and a date for follower figures", () => {
    expect(socialSnapshotSchema.safeParse({ ...sample, followersObservedOn: null }).success).toBe(
      false,
    );
    expect(
      socialSnapshotSchema.safeParse({
        ...sample,
        followers: null,
        followersObservedOn: null,
        posts: null,
        views: null,
        interactions: null,
      }).success,
    ).toBe(false);
    expect(socialSnapshotSchema.safeParse({ ...sample, followers: 0 }).success).toBe(true);
  });
});

describe("Metricool schedule reconciliation", () => {
  it("accepts only the fixed Free plan and a reviewed empty future schedule", () => {
    expect(
      metricoolScheduleReconciliationSchema.safeParse({
        idempotencyKey: "451d3866-7fa5-4be2-b696-0ddad594713f",
        quotaUsed: 6,
        quotaLimit: 20,
        futureSchedules: [],
        evidenceNote: "Brandul 7230540 nu are programări viitoare.",
      }).success,
    ).toBe(true);
    expect(
      metricoolScheduleReconciliationSchema.safeParse({
        idempotencyKey: "451d3866-7fa5-4be2-b696-0ddad594713f",
        quotaUsed: 6,
        quotaLimit: 20,
        futureSchedules: [{ externalId: "inventat" }],
        evidenceNote: "Programare neverificată.",
      }).success,
    ).toBe(false);
    expect(
      metricoolScheduleReconciliationSchema.safeParse({
        idempotencyKey: "451d3866-7fa5-4be2-b696-0ddad594713f",
        quotaUsed: 21,
        quotaLimit: 20,
        futureSchedules: [],
        evidenceNote: "Contor invalid peste limita planului.",
      }).success,
    ).toBe(false);
    expect(
      metricoolScheduleReconciliationSchema.safeParse({
        idempotencyKey: "not-a-uuid",
        quotaUsed: 6,
        quotaLimit: 20,
        futureSchedules: [],
        evidenceNote: "Cheia de idempotentă trebuie să fie validă.",
      }).success,
    ).toBe(false);
  });
});
