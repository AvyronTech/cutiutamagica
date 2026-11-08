/** Two internal chores on the existing queue; no new cron triggers or external service. */
export interface ScheduledMaintenanceMessage {
  version: 4;
  type: "maintenance.backup" | "maintenance.security";
}
export function isScheduledMaintenanceMessage(
  value: unknown,
): value is ScheduledMaintenanceMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Object.keys(item).length === 2 &&
    item.version === 4 &&
    (item.type === "maintenance.backup" || item.type === "maintenance.security")
  );
}
export async function enqueueScheduledMaintenance(env: Pick<Env, "COMMERCE_EVENTS">) {
  await env.COMMERCE_EVENTS.sendBatch([
    {
      body: { version: 4, type: "maintenance.backup" } satisfies ScheduledMaintenanceMessage,
      contentType: "json",
      delaySeconds: 900,
    },
    {
      body: { version: 4, type: "maintenance.security" } satisfies ScheduledMaintenanceMessage,
      contentType: "json",
      delaySeconds: 1800,
    },
  ]);
}
export async function processScheduledMaintenance(env: Env, message: ScheduledMaintenanceMessage) {
  if (message.type === "maintenance.backup") {
    const { processScheduledBackup } = await import("../services/backup-center");
    await processScheduledBackup(env);
  } else {
    const { maintainSecurityLog } = await import("../security/events");
    await maintainSecurityLog(env.DB);
  }
}
