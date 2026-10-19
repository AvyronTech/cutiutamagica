import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  adminChatReplySchema,
  chatAiControlSchema,
  chatConversationStatusSchema,
  chatKnowledgeSchema,
  chatSettingsSchema,
} from "@/lib/chat-contracts";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import {
  addAdminChatMessage,
  getChatSettings,
  latestChatDraft,
  listAdminChatConversations,
  listAdminChatMessages,
  listChatKnowledge,
  saveChatKnowledge,
  saveChatSettings,
  setChatAiPaused,
  setChatConversationStatus,
} from "@/server/db/chat.repository";

function sameOrigin(): void {
  const request = getRequest();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new Error("Cerere de administrare nepermisă.");
  }
}

export const getChatCenter = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "chat.read");
    const [settings, conversations, knowledge, usage] = await Promise.all([
      getChatSettings(env.DB),
      listAdminChatConversations(env.DB),
      listChatKnowledge(env.DB),
      env.DB.prepare("SELECT requests FROM chat_ai_daily_usage WHERE usage_date=?1")
        .bind(new Date().toISOString().slice(0, 10))
        .first<{ requests: number }>(),
    ]);
    return { settings, conversations, knowledge, aiUsageToday: usage?.requests ?? 0 };
  });

export const getChatConversation = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(z.object({ conversationId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "chat.read");
    const messages = await listAdminChatMessages(env.DB, data.conversationId);
    return { messages, draft: await latestChatDraft(env.DB, data.conversationId) };
  });

export const replyToChatConversation = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(adminChatReplySchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "chat.write");
    await addAdminChatMessage(
      env.DB,
      data.conversationId,
      data.messageId,
      data.body,
      context.admin.id,
    );
    return { ok: true };
  });

export const updateChatConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(chatConversationStatusSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "chat.write");
    await setChatConversationStatus(env.DB, data.conversationId, data.status, context.admin.id);
    return { ok: true };
  });

export const controlChatAi = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(chatAiControlSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "chat.write");
    await setChatAiPaused(env.DB, data.conversationId, data.paused, context.admin.id);
    return { ok: true };
  });

export const updateChatKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(chatKnowledgeSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "chat.write");
    await saveChatKnowledge(env.DB, data, context.admin.id);
    return { ok: true };
  });

export const updateChatSettings = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(chatSettingsSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "chat.write");
    await saveChatSettings(env.DB, data, context.admin.id);
    return { ok: true };
  });
