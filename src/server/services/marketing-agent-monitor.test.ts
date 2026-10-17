import { describe, expect, it } from "vitest";
import { evaluateMarketingAgentHealth } from "./marketing-agent-monitor";

describe("marketing agent flow monitoring", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");

  it("reports no blocker when verified sources are fresh", () => {
    expect(
      evaluateMarketingAgentHealth(
        {
          activeSocialAccounts: 3,
          activeMetricoolConnections: 1,
          googleCredentialStatus: "verified",
          lastGscImportAt: "2026-10-12T08:00:00.000Z",
          failedSocialPosts: 0,
          failedExchanges: 0,
          pendingApprovals: 2,
        },
        26,
        now,
      ),
    ).toEqual([]);
  });

  it("keeps browser-only setup and failed operations visible", () => {
    expect(
      evaluateMarketingAgentHealth(
        {
          activeSocialAccounts: 0,
          activeMetricoolConnections: 0,
          googleCredentialStatus: "unverified",
          lastGscImportAt: null,
          failedSocialPosts: 1,
          failedExchanges: 1,
          pendingApprovals: 4,
        },
        26,
        now,
      ),
    ).toEqual(["social_connector_unverified", "gsc_credential_unverified", "failed_operations"]);
  });

  it("flags stale GSC data only after the configured threshold", () => {
    expect(
      evaluateMarketingAgentHealth(
        {
          activeSocialAccounts: 1,
          activeMetricoolConnections: 0,
          googleCredentialStatus: "verified",
          lastGscImportAt: "2026-10-10T08:00:00.000Z",
          failedSocialPosts: 0,
          failedExchanges: 0,
          pendingApprovals: 0,
        },
        26,
        now,
      ),
    ).toEqual(["gsc_data_stale"]);
  });
});
