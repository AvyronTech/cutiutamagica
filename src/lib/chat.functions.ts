import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  adminChatReplySchema,
  chatConversationStatusSchema,
  chatSettingsSchema,
} from "@/lib/chat-contracts";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import {
  addAdminChatMessage,
  getChatSettings,
  listAdminChatConversations,
  listAdminChatMessages,
  saveChatSettings,
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
    const [settings, conversations] = await Promise.all([
      getChatSettings(env.DB),
      listAdminChatConversations(env.DB),
    ]);
    return { settings, conversations };
  });

export const getChatConversation = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(z.object({ conversationId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "chat.read");
    return { messages: await listAdminChatMessages(env.DB, data.conversationId) };
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

export const updateChatSettings = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(chatSettingsSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "chat.write");
    if (data.aiEnabled) {
      throw new Error(
        "Modul AI rămâne dezactivat până la configurarea furnizorului și politicii de date.",
      );
    }
    await saveChatSettings(env.DB, data, context.admin.id);
    return { ok: true };
  });
