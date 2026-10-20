import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminNotificationLink } from "@/lib/admin-notification-link";
import {
  addAdminChatMessage,
  addVisitorMessage,
  createChatConversation,
  latestChatDraft,
  listVisitorMessages,
  saveChatKnowledge,
} from "./db/chat.repository";
import {
  answerCustomerChat,
  isChatMetaResponse,
  redactChatForAi,
  supportedPriceClaims,
} from "./services/customer-chat-ai";

let sqlite: DatabaseSync;
class Statement {
  private args: Record<string, SQLInputValue> = {};
  constructor(private sql: string) {}
  bind(...args: SQLInputValue[]) {
    this.args = Object.fromEntries(args.map((v, i) => [`?${i + 1}`, v]));
    return this;
  }
  async run() {
    if (/^\s*SELECT/i.test(this.sql))
      return { results: sqlite.prepare(this.sql).all(this.args), meta: { changes: 0 } };
    const result = sqlite.prepare(this.sql).run(this.args);
    return { meta: { changes: Number(result.changes) } };
  }
  async all<T>() {
    return { results: sqlite.prepare(this.sql).all(this.args) as T[] };
  }
  async first<T>() {
    return (sqlite.prepare(this.sql).get(this.args) as T | undefined) ?? null;
  }
}
function database() {
  return {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec("BEGIN");
      try {
        const result = await Promise.all(statements.map((statement) => statement.run()));
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(resolve("cloudflare/d1/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(resolve("cloudflare/d1/migrations", file), "utf8"));
  for (const file of ["0001_music_boxes.sql", "0002_vinted_catalog.sql", "0003_vinted_prices.sql"])
    sqlite.exec(readFileSync(resolve("cloudflare/d1/seed", file), "utf8"));
  sqlite.prepare("UPDATE chat_settings SET ai_enabled=1 WHERE id='default'").run();
  sqlite
    .prepare(
      "INSERT INTO admin_users(id,external_subject,email,status) VALUES('chat-admin','chat-admin','admin@example.test','active')",
    )
    .run();
});
afterEach(() => sqlite.close());

describe("customer chat assistant boundaries", () => {
  it("opens only local admin notification destinations", () => {
    expect(adminNotificationLink("/admin/chat?conversation=abc")).toBe(
      "/admin/chat?conversation=abc",
    );
    expect(adminNotificationLink("https://evil.test/admin/chat")).toBeNull();
    expect(adminNotificationLink("//evil.test/admin/chat")).toBeNull();
    expect(adminNotificationLink("javascript:alert(1)")).toBeNull();
  });

  it("masks contact details and rejects unsupported price claims", () => {
    expect(redactChatForAi("Scrie la client@example.com sau 0712345678")).not.toContain(
      "client@example.com",
    );
    expect(supportedPriceClaims("Costă 139 RON", [139])).toBe(true);
    expect(supportedPriceClaims("Costă 99 RON", [139])).toBe(false);
    expect(isChatMetaResponse("Prezintă o gamă variată vizitatorului.")).toBe(true);
    expect(isChatMetaResponse("Ți-aș recomanda o cutiuță cu melodia preferată.")).toBe(false);
  });

  it("rewrites an instruction-like answer before sending it to the visitor", async () => {
    const db = database();
    const ai = vi
      .fn()
      .mockResolvedValueOnce({ response: "Prezintă vizitatorului cutiuțele pentru aniversare." })
      .mockResolvedValueOnce({
        response:
          "Pentru aniversare, ți-aș recomanda o cutiuță cu melodia preferată. Ce temă îi place?",
      });
    const env = { DB: db, AI: { run: ai } } as unknown as Env;
    const session = await createChatConversation(db, {
      consent: true,
      sourcePath: "/produse",
      context: {},
    });
    const messageId = crypto.randomUUID();
    await addVisitorMessage(db, session.conversationId, messageId, "Ce cadou recomanzi?");
    await answerCustomerChat(env, session.conversationId, messageId);
    expect(ai).toHaveBeenCalledTimes(2);
    const messages = await listVisitorMessages(db, session.conversationId);
    expect(messages.at(-1)?.body).toContain("ți-aș recomanda");
    expect(messages.at(-1)?.body).not.toContain("Prezintă");
  });

  it("answers once automatically and stops after an administrator takes over", async () => {
    const db = database();
    const ai = vi.fn(async () => ({
      response: "Te ajutăm să alegi cutiuța potrivită. Ce atmosferă îți dorești pentru cadou?",
    }));
    const env = { DB: db, AI: { run: ai } } as unknown as Env;
    const session = await createChatConversation(db, {
      consent: true,
      sourcePath: "/produse",
      context: {},
    });
    const messageId = crypto.randomUUID();
    expect(
      await addVisitorMessage(db, session.conversationId, messageId, "Caut un cadou muzical."),
    ).toBe(true);
    expect(
      await addVisitorMessage(db, session.conversationId, messageId, "Caut un cadou muzical."),
    ).toBe(false);
    await answerCustomerChat(env, session.conversationId, messageId);
    expect(ai).toHaveBeenCalledTimes(1);
    expect(await latestChatDraft(db, session.conversationId)).toBeNull();
    expect(
      (await listVisitorMessages(db, session.conversationId)).map((message) => message.senderType),
    ).toEqual(["visitor", "assistant"]);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action='chat.ai.answer'").get(),
    ).toMatchObject({ count: 1 });
    await answerCustomerChat(env, session.conversationId, messageId);
    expect(ai).toHaveBeenCalledTimes(1);
    await addAdminChatMessage(
      db,
      session.conversationId,
      crypto.randomUUID(),
      "Preiau eu conversația.",
      "chat-admin",
    );
    const secondId = crypto.randomUUID();
    await addVisitorMessage(db, session.conversationId, secondId, "Mulțumesc.");
    await answerCustomerChat(env, session.conversationId, secondId);
    expect(ai).toHaveBeenCalledTimes(1);
    expect(await latestChatDraft(db, session.conversationId)).toBeNull();
    expect(
      sqlite
        .prepare("SELECT ai_paused FROM chat_conversations WHERE id=?")
        .get(session.conversationId),
    ).toMatchObject({ ai_paused: 1 });
  });

  it("does not send a generated answer when an administrator takes over during generation", async () => {
    const db = database();
    let complete!: (value: { response: string }) => void;
    const ai = vi.fn(() => new Promise<{ response: string }>((resolve) => (complete = resolve)));
    const env = { DB: db, AI: { run: ai } } as unknown as Env;
    const session = await createChatConversation(db, {
      consent: true,
      sourcePath: "/produse",
      context: {},
    });
    const messageId = crypto.randomUUID();
    await addVisitorMessage(db, session.conversationId, messageId, "Ce model îmi recomanzi?");
    const running = answerCustomerChat(env, session.conversationId, messageId);
    await vi.waitFor(() => expect(ai).toHaveBeenCalledOnce());
    await addAdminChatMessage(
      db,
      session.conversationId,
      crypto.randomUUID(),
      "Bună! Te ajut eu.",
      "chat-admin",
    );
    complete({ response: "Eu sunt asistentul virtual. Îți recomand un cadou cald." });
    await running;
    expect(
      (await listVisitorMessages(db, session.conversationId)).map((m) => m.senderType),
    ).toEqual(["visitor", "admin"]);
  });

  it("passes order questions to the team and acknowledges the handoff", async () => {
    const db = database();
    const ai = vi.fn();
    const env = { DB: db, AI: { run: ai } } as unknown as Env;
    const session = await createChatConversation(db, {
      consent: true,
      sourcePath: "/cart",
      context: {},
    });
    const messageId = crypto.randomUUID();
    await addVisitorMessage(db, session.conversationId, messageId, "Unde este comanda mea?");
    await answerCustomerChat(env, session.conversationId, messageId);
    expect(ai).not.toHaveBeenCalled();
    expect(
      (await listVisitorMessages(db, session.conversationId)).map((m) => m.senderType),
    ).toEqual(["visitor", "assistant"]);
    expect(
      sqlite
        .prepare("SELECT status,ai_paused FROM chat_conversations WHERE id=?")
        .get(session.conversationId),
    ).toMatchObject({ status: "pending", ai_paused: 1 });
  });

  it("saves approved knowledge with optimistic version checks", async () => {
    const db = database();
    const item = {
      id: crypto.randomUUID(),
      title: "Materiale",
      answer: "Consultați fișa produsului pentru materialele actuale.",
      enabled: true,
      sortOrder: 1,
      version: 0,
    };
    await saveChatKnowledge(db, item, "chat-admin");
    await saveChatKnowledge(
      db,
      { ...item, version: 1, answer: "Descrierea actuală este în fișa produsului." },
      "chat-admin",
    );
    await expect(saveChatKnowledge(db, item, "chat-admin")).rejects.toThrow("alt administrator");
  });
});
