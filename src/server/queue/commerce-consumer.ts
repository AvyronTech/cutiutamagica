import {
  isAvyronQueueMessage,
  processAvyronSync,
  type AvyronQueueMessage,
} from "@/server/queue/avyron-sync-consumer";

interface CommerceNotificationQueueMessage {
  version: 1;
  outboxId: string;
}

type CommerceQueueMessage = CommerceNotificationQueueMessage | AvyronQueueMessage;

type OutboxRow = Record<string, string | number | null>;

function isCommerceQueueMessage(value: unknown): value is CommerceNotificationQueueMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 1 && typeof candidate.outboxId === "string";
}

function parseNotificationPayload(payload: string): {
  type: string;
  severity: string;
  title: string;
  message: string;
  actionUrl: string | null;
} | null {
  try {
    const value = JSON.parse(payload) as Record<string, unknown>;
    if (typeof value.title !== "string" || typeof value.message !== "string") return null;
    return {
      type: typeof value.type === "string" ? value.type : "system",
      severity: typeof value.severity === "string" ? value.severity : "info",
      title: value.title,
      message: value.message,
      actionUrl: typeof value.actionUrl === "string" ? value.actionUrl : null,
    };
  } catch {
    return null;
  }
}

async function markFailed(
  db: D1Database,
  outboxId: string,
  code: string,
  message: string,
): Promise<void> {
  await db
    .prepare(
      `
    UPDATE outbox_events
    SET status = 'failed',
        attempt_count = attempt_count + 1,
        last_error_code = ?1,
        last_error_message = ?2,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?3 AND status != 'completed'
  `,
    )
    .bind(code, message.slice(0, 500), outboxId)
    .run();
}

async function processMessage(db: D1Database, outboxId: string): Promise<"ack" | "retry"> {
  const row = await db
    .prepare(
      `
    SELECT id, aggregate_type, aggregate_id, event_type, destination, payload_json, status
    FROM outbox_events
    WHERE id = ?1
  `,
    )
    .bind(outboxId)
    .first<OutboxRow>();

  if (!row || row.status === "completed") return "ack";
  if (row.destination !== "admin.notification") {
    await markFailed(db, outboxId, "ADAPTER_NOT_CONFIGURED", `Destination: ${row.destination}`);
    return "ack";
  }

  const notification = parseNotificationPayload(String(row.payload_json ?? ""));
  if (!notification) {
    await markFailed(
      db,
      outboxId,
      "INVALID_NOTIFICATION_PAYLOAD",
      "Payload incomplet sau invalid.",
    );
    return "ack";
  }

  const notificationId = crypto.randomUUID();
  const [notificationResult] = await db.batch<OutboxRow>([
    db
      .prepare(
        `
      INSERT OR IGNORE INTO admin_notifications (
        id, notification_type, severity, title, message, entity_type,
        entity_id, deduplication_key, action_url
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `,
      )
      .bind(
        notificationId,
        notification.type,
        notification.severity,
        notification.title,
        notification.message,
        row.aggregate_type,
        row.aggregate_id,
        `outbox:${outboxId}`,
        notification.actionUrl,
      ),
    db
      .prepare(
        `
      UPDATE outbox_events
      SET status = 'completed',
          attempt_count = attempt_count + 1,
          completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1 AND status != 'completed'
    `,
      )
      .bind(outboxId),
  ]);

  return notificationResult.success ? "ack" : "retry";
}

export async function consumeCommerceEvents(batch: MessageBatch<unknown>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    if (isAvyronQueueMessage(message.body)) {
      try {
        const result = await processAvyronSync(env, message.body.jobId);
        if (result.action === "ack") message.ack();
        else message.retry({ delaySeconds: result.delaySeconds ?? 30 });
      } catch (error) {
        console.error("avyron.sync_queue_failed", { jobId: message.body.jobId, error });
        message.retry({ delaySeconds: 30 });
      }
      continue;
    }
    if (!isCommerceQueueMessage(message.body)) {
      message.ack();
      continue;
    }

    try {
      const result = await processMessage(env.DB, message.body.outboxId);
      if (result === "ack") message.ack();
      else message.retry({ delaySeconds: 30 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown queue error";
      await markFailed(env.DB, message.body.outboxId, "QUEUE_PROCESSING_FAILED", detail).catch(
        () => undefined,
      );
      message.retry({ delaySeconds: 30 });
    }
  }
}

export type { CommerceQueueMessage };
