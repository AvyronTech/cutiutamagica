import { describe, expect, it } from "vitest";
import { rankUnfollowCandidates } from "@/lib/social-analysis";

describe("rankUnfollowCandidates", () => {
  it("excludes reciprocal and protected accounts and deduplicates usernames", () => {
    const result = rankUnfollowCandidates(
      [
        {
          username: "fan",
          profileUrl: "",
          followsBack: false,
          engagementRate: 0.1,
          lastInteractionAt: null,
          protected: false,
        },
        {
          username: "FAN",
          profileUrl: "",
          followsBack: false,
          engagementRate: 3,
          lastInteractionAt: null,
          protected: false,
        },
        {
          username: "partner",
          profileUrl: "",
          followsBack: true,
          engagementRate: 0,
          lastInteractionAt: null,
          protected: false,
        },
        {
          username: "creator",
          profileUrl: "",
          followsBack: false,
          engagementRate: 0,
          lastInteractionAt: null,
          protected: true,
        },
      ],
      Date.UTC(2026, 8, 22),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ username: "fan", score: 95 });
  });

  it("never proposes more than 50 accounts", () => {
    const accounts = Array.from({ length: 80 }, (_, index) => ({
      username: `account-${index}`,
      profileUrl: "",
      followsBack: false,
      engagementRate: null,
      lastInteractionAt: null,
      protected: false,
    }));
    expect(rankUnfollowCandidates(accounts)).toHaveLength(50);
  });
});
