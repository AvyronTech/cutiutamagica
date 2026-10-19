import type { ChatConversationStatus, ChatSettings } from "@/lib/chat-contracts";

type SettingsRow = {
  enabled: number;
  availability: ChatSettings["availability"];
  position: ChatSettings["position"];
  accent_color: string;
  welcome_title: string;
  welcome_message: string;
  offline_message: string;
  response_time_label: string;
  require_consent: number;
  collect_name: number;
  collect_email: number;
  quick_replies_json: string;
  ai_enabled: number;
  retention_days: number;
};

export type ChatMessage = {
  id: string;
  senderType: "visitor" | "admin" | "system" | "assistant";
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type AdminChatConversation = {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: ChatConversationStatus;
  priority: "low" | "normal" | "high";
  sourcePath: string;
  unreadAdminCount: number;
  unreadVisitorCount: number;
  lastMessageAt: string;
  lastMessage: string | null;
  createdAt: string;
  aiPaused: boolean;
};

export type ChatKnowledge = {
  id: string;
  title: string;
  answer: string;
  enabled: boolean;
  sortOrder: number;
  version: number;
  updatedAt: string;
};

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function parseQuickReplies(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function getChatSettings(db: D1Database): Promise<ChatSettings> {
  const row = await db
    .prepare("SELECT * FROM chat_settings WHERE id='default'")
    .first<SettingsRow>();
  if (!row) throw new Error("Configurația chatului lipsește. Aplică migrația D1.");
  return {
    enabled: row.enabled === 1,
    availability: row.availability,
    position: row.position,
    accentColor: row.accent_color,
    welcomeTitle: row.welcome_title,
    welcomeMessage: row.welcome_message,
    offlineMessage: row.offline_message,
    responseTimeLabel: row.response_time_label,
    requireConsent: row.require_consent === 1,
    collectName: row.collect_name === 1,
    collectEmail: row.collect_email === 1,
    quickReplies: parseQuickReplies(row.quick_replies_json),
    aiEnabled: row.ai_enabled === 1,
    retentionDays: row.retention_days,
  };
}

export async function saveChatSettings(
  db: D1Database,
  settings: ChatSettings,
  adminId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE chat_settings SET
        enabled=?1,availability=?2,position=?3,accent_color=?4,welcome_title=?5,
        welcome_message=?6,offline_message=?7,response_time_label=?8,require_consent=?9,
        collect_name=?10,collect_email=?11,quick_replies_json=?12,ai_enabled=?13,
        retention_days=?14,updated_by=?15,updated_at=?16 WHERE id='default'`,
    )
    .bind(
      settings.enabled ? 1 : 0,
      settings.availability,
      settings.position,
      settings.accentColor,
      settings.welcomeTitle,
      settings.welcomeMessage,
      settings.offlineMessage,
      settings.responseTimeLabel,
      settings.requireConsent ? 1 : 0,
      settings.collectName ? 1 : 0,
      settings.collectEmail ? 1 : 0,
      JSON.stringify(settings.quickReplies),
      settings.aiEnabled ? 1 : 0,
      settings.retentionDays,
      adminId,
      new Date().toISOString(),
    )
    .run();
}

export async function createChatConversation(
  db: D1Database,
  input: {
    name?: string;
    email?: string;
    consent: boolean;
    sourcePath: string;
    visitorKey?: string;
    context: Record<string, string | undefined>;
  },
): Promise<{ conversationId: string; accessToken: string }> {
  const conversationId = crypto.randomUUID();
  const accessToken = randomToken();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO chat_conversations(
        id,access_token_hash,visitor_key_hash,visitor_name,visitor_email,consent_at,
        source_path,context_json,last_message_at,created_at,updated_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9,?9)`,
    )
    .bind(
      conversationId,
      await sha256(accessToken),
      input.visitorKey ? await sha256(input.visitorKey) : null,
      input.name || null,
      input.email ? input.email.toLowerCase() : null,
      input.consent ? now : null,
      input.sourcePath,
      JSON.stringify(input.context),
      now,
    )
    .run();
  return { conversationId, accessToken };
}

export async function verifyChatAccess(
  db: D1Database,
  conversationId: string,
  accessToken: string,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM chat_conversations WHERE id=?1 AND access_token_hash=?2")
    .bind(conversationId, await sha256(accessToken))
    .first();
  return Boolean(row);
}

export async function addVisitorMessage(
  db: D1Database,
  conversationId: string,
  messageId: string,
  body: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const conversation = await db
    .prepare("SELECT unread_admin_count,status FROM chat_conversations WHERE id=?1")
    .bind(conversationId)
    .first<{ unread_admin_count: number; status: string }>();
  if (!conversation || conversation.status === "spam")
    throw new Error("Conversația nu este disponibilă.");
  const inserted = await db
    .prepare(
      `INSERT OR IGNORE INTO chat_messages(id,conversation_id,sender_type,body,created_at)
       VALUES(?1,?2,'visitor',?3,?4)`,
    )
    .bind(messageId, conversationId, body, now)
    .run();
  if ((inserted.meta.changes ?? 0) === 0) return false;
  await db
    .prepare(
      `UPDATE chat_conversations SET status=CASE WHEN status='closed' THEN 'open' ELSE status END,
          unread_admin_count=unread_admin_count+1,last_message_at=?2,last_visitor_message_at=?2,
          last_visitor_message_id=?3,updated_at=?2 WHERE id=?1`,
    )
    .bind(conversationId, now, messageId)
    .run();
  if (conversation.unread_admin_count === 0) {
    await db
      .prepare(
        `INSERT INTO admin_notifications(
          id,notification_type,severity,title,message,entity_type,entity_id,
          deduplication_key,action_url,created_at
        ) VALUES(?1,'system','info','Mesaj nou în chat',?2,'chat_conversation',?3,?4,
          ?5,?6)
        ON CONFLICT(deduplication_key) DO UPDATE SET
          message=excluded.message,read_at=NULL,dismissed_at=NULL,created_at=excluded.created_at`,
      )
      .bind(
        crypto.randomUUID(),
        body.length > 120 ? `${body.slice(0, 117)}...` : body,
        conversationId,
        `chat-unread:${conversationId}`,
        `/admin/chat?conversation=${conversationId}`,
        now,
      )
      .run();
  }
  return true;
}

export async function listVisitorMessages(
  db: D1Database,
  conversationId: string,
): Promise<ChatMessage[]> {
  const result = await db
    .prepare(
      `SELECT id,sender_type AS senderType,body,created_at AS createdAt,read_at AS readAt
       FROM chat_messages WHERE conversation_id=?1 ORDER BY created_at,id LIMIT 250`,
    )
    .bind(conversationId)
    .all<ChatMessage>();
  await db.batch([
    db
      .prepare("UPDATE chat_conversations SET unread_visitor_count=0 WHERE id=?1")
      .bind(conversationId),
    db
      .prepare(
        "UPDATE chat_messages SET read_at=COALESCE(read_at,?2) WHERE conversation_id=?1 AND sender_type IN ('admin','assistant')",
      )
      .bind(conversationId, new Date().toISOString()),
  ]);
  return result.results;
}

export async function listAdminChatConversations(db: D1Database): Promise<AdminChatConversation[]> {
  const result = await db
    .prepare(
      `SELECT c.id,c.visitor_name AS visitorName,c.visitor_email AS visitorEmail,c.status,c.priority,
        c.source_path AS sourcePath,c.unread_admin_count AS unreadAdminCount,
        c.unread_visitor_count AS unreadVisitorCount,c.last_message_at AS lastMessageAt,
        c.created_at AS createdAt,c.ai_paused AS aiPaused,
        (SELECT body FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS lastMessage
       FROM chat_conversations c
       WHERE c.status!='spam' OR c.last_message_at>=datetime('now','-7 days')
       ORDER BY CASE c.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
         c.last_message_at DESC LIMIT 150`,
    )
    .all<AdminChatConversation>();
  return result.results.map((item) => ({ ...item, aiPaused: Boolean(item.aiPaused) }));
}

export async function listAdminChatMessages(
  db: D1Database,
  conversationId: string,
): Promise<ChatMessage[]> {
  const result = await db
    .prepare(
      `SELECT id,sender_type AS senderType,body,created_at AS createdAt,read_at AS readAt
       FROM chat_messages WHERE conversation_id=?1 ORDER BY created_at,id LIMIT 500`,
    )
    .bind(conversationId)
    .all<ChatMessage>();
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare("UPDATE chat_conversations SET unread_admin_count=0 WHERE id=?1")
      .bind(conversationId),
    db
      .prepare(
        "UPDATE chat_messages SET read_at=COALESCE(read_at,?2) WHERE conversation_id=?1 AND sender_type='visitor'",
      )
      .bind(conversationId, now),
    db
      .prepare("UPDATE admin_notifications SET read_at=?2 WHERE deduplication_key=?1")
      .bind(`chat-unread:${conversationId}`, now),
  ]);
  return result.results;
}

export async function latestChatDraft(
  db: D1Database,
  conversationId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT r.draft_body AS body FROM chat_ai_runs r
     WHERE r.conversation_id=?1 AND r.status='draft' AND r.sent_message_id IS NULL
       AND NOT EXISTS(SELECT 1 FROM chat_messages m WHERE m.conversation_id=?1
         AND m.sender_type='admin' AND m.created_at>=r.completed_at)
     ORDER BY r.created_at DESC LIMIT 1`,
    )
    .bind(conversationId)
    .first<{ body: string }>();
  return row?.body ?? null;
}

export async function addAdminChatMessage(
  db: D1Database,
  conversationId: string,
  messageId: string,
  body: string,
  adminId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const inserted = await db
    .prepare(
      `INSERT OR IGNORE INTO chat_messages(id,conversation_id,sender_type,sender_id,body,created_at)
       VALUES(?1,?2,'admin',?3,?4,?5)`,
    )
    .bind(messageId, conversationId, adminId, body, now)
    .run();
  if ((inserted.meta.changes ?? 0) === 0) return;
  await db
    .prepare(
      `UPDATE chat_conversations SET status='pending',ai_paused=1,assigned_admin_id=COALESCE(assigned_admin_id,?2),
          unread_visitor_count=unread_visitor_count+1,last_message_at=?3,last_admin_message_at=?3,
          updated_at=?3 WHERE id=?1`,
    )
    .bind(conversationId, adminId, now)
    .run();
}

export async function setChatConversationStatus(
  db: D1Database,
  conversationId: string,
  status: ChatConversationStatus,
  adminId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE chat_conversations SET status=?2,ai_paused=CASE WHEN ?2 IN ('closed','spam') THEN 1 ELSE ai_paused END,
       assigned_admin_id=COALESCE(assigned_admin_id,?3),
       updated_at=?4 WHERE id=?1`,
    )
    .bind(conversationId, status, adminId, new Date().toISOString())
    .run();
}

export async function setChatAiPaused(
  db: D1Database,
  conversationId: string,
  paused: boolean,
  adminId: string,
) {
  const result = await db
    .prepare(
      `UPDATE chat_conversations SET ai_paused=?2,status=CASE WHEN ?2=0 THEN 'open' ELSE 'pending' END,
     assigned_admin_id=CASE WHEN ?2=0 THEN NULL ELSE ?3 END,updated_at=?4
     WHERE id=?1 AND status!='spam'`,
    )
    .bind(conversationId, paused ? 1 : 0, adminId, new Date().toISOString())
    .run();
  if (!result.meta.changes) throw new Error("Conversația nu este disponibilă.");
}

export async function listChatKnowledge(db: D1Database): Promise<ChatKnowledge[]> {
  const result = await db
    .prepare(
      `SELECT id,title,answer,enabled,sort_order AS sortOrder,version,updated_at AS updatedAt
     FROM chat_knowledge ORDER BY sort_order,title LIMIT 100`,
    )
    .all<Omit<ChatKnowledge, "enabled"> & { enabled: number }>();
  return result.results.map((item) => ({ ...item, enabled: Boolean(item.enabled) }));
}

export async function saveChatKnowledge(
  db: D1Database,
  item: Omit<ChatKnowledge, "updatedAt">,
  adminId: string,
) {
  const now = new Date().toISOString();
  const result =
    item.version === 0
      ? await db
          .prepare(
            `INSERT OR IGNORE INTO chat_knowledge(id,title,answer,enabled,sort_order,version,updated_by,updated_at)
             VALUES(?1,?2,?3,?4,?5,1,?6,?7)`,
          )
          .bind(
            item.id,
            item.title,
            item.answer,
            item.enabled ? 1 : 0,
            item.sortOrder,
            adminId,
            now,
          )
          .run()
      : await db
          .prepare(
            `UPDATE chat_knowledge SET title=?2,answer=?3,enabled=?4,sort_order=?5,
             version=version+1,updated_by=?6,updated_at=?7 WHERE id=?1 AND version=?8`,
          )
          .bind(
            item.id,
            item.title,
            item.answer,
            item.enabled ? 1 : 0,
            item.sortOrder,
            adminId,
            now,
            item.version,
          )
          .run();
  if (!result.meta.changes)
    throw new Error("Informația a fost schimbată de alt administrator. Reîncarcă pagina.");
}

export async function purgeExpiredChatConversations(db: D1Database): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM chat_conversations
       WHERE updated_at < datetime(
         'now', '-' || (SELECT retention_days FROM chat_settings WHERE id='default') || ' days'
       )`,
    )
    .run();
  return result.meta.changes ?? 0;
}
