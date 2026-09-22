import { describe, expect, it } from "vitest";
import {
  chatSettingsSchema,
  createChatConversationSchema,
  visitorChatMessageSchema,
} from "@/lib/chat-contracts";
import { randomToken, sha256 } from "@/server/db/chat.repository";

describe("chat contracts", () => {
  it("accepts a minimal privacy-aware conversation", () => {
    expect(
      createChatConversationSchema.safeParse({ consent: true, sourcePath: "/produse" }).success,
    ).toBe(true);
  });

  it("rejects invalid visitor messages", () => {
    expect(visitorChatMessageSchema.safeParse({ messageId: "retry", body: "" }).success).toBe(
      false,
    );
  });

  it("keeps configurable visual values constrained", () => {
    const parsed = chatSettingsSchema.safeParse({
      enabled: true,
      availability: "online",
      position: "right",
      accentColor: "purple",
      welcomeTitle: "Atelier",
      welcomeMessage: "Un mesaj suficient de lung pentru client.",
      offlineMessage: "Revenim cu un răspuns cât mai curând posibil.",
      responseTimeLabel: "Răspundem curând",
      requireConsent: true,
      collectName: false,
      collectEmail: false,
      quickReplies: [],
      aiEnabled: false,
      retentionDays: 365,
    });
    expect(parsed.success).toBe(false);
  });

  it("generates opaque tokens and stable hashes", async () => {
    const first = randomToken();
    const second = randomToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(await sha256(first)).toBe(await sha256(first));
    expect(await sha256(first)).not.toBe(await sha256(second));
  });
});
