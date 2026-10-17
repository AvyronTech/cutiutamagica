type MonitorSettings = {
  enabled: boolean;
  intervalMinutes: number;
  staleAfterHours: number;
};

type MonitorSnapshot = {
  activeSocialAccounts: number;
  activeMetricoolConnections: number;
  googleCredentialStatus: string | null;
  lastGscImportAt: string | null;
  failedSocialPosts: number;
  failedExchanges: number;
  pendingApprovals: number;
};

export type MarketingAgentBlocker =
  | "social_connector_unverified"
  | "gsc_credential_unverified"
  | "gsc_data_stale"
  | "failed_operations";

const fallbackSettings: MonitorSettings = {
  enabled: true,
  intervalMinutes: 60,
  staleAfterHours: 26,
};

function boundedInteger(value: unknown, minimum: number, maximum: number, fallback: number) {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : fallback;
}

function parseMonitorSettings(valueJson: string | null): MonitorSettings {
  if (!valueJson) return fallbackSettings;
  try {
    const root = JSON.parse(valueJson) as { monitoring?: Record<string, unknown> };
    const monitoring = root.monitoring ?? {};
    return {
      enabled: typeof monitoring.enabled === "boolean" ? monitoring.enabled : true,
      intervalMinutes: boundedInteger(monitoring.intervalMinutes, 15, 1_440, 60),
      staleAfterHours: boundedInteger(monitoring.staleAfterHours, 1, 168, 26),
    };
  } catch {
    return fallbackSettings;
  }
}

export function evaluateMarketingAgentHealth(
  snapshot: MonitorSnapshot,
  staleAfterHours: number,
  now: Date,
): MarketingAgentBlocker[] {
  const blockers: MarketingAgentBlocker[] = [];
  if (snapshot.activeSocialAccounts + snapshot.activeMetricoolConnections === 0) {
    blockers.push("social_connector_unverified");
  }
  if (snapshot.googleCredentialStatus !== "verified") {
    blockers.push("gsc_credential_unverified");
  } else {
    const importedAt = snapshot.lastGscImportAt ? Date.parse(snapshot.lastGscImportAt) : Number.NaN;
    if (
      !Number.isFinite(importedAt) ||
      now.getTime() - importedAt > staleAfterHours * 60 * 60 * 1_000
    ) {
      blockers.push("gsc_data_stale");
    }
  }
  if (snapshot.failedSocialPosts + snapshot.failedExchanges > 0) {
    blockers.push("failed_operations");
  }
  return blockers;
}

function bucharestDay(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

const blockerCopy: Record<MarketingAgentBlocker, { title: string; message: string }> = {
  social_connector_unverified: {
    title: "Conectorii sociali necesită verificare",
    message:
      "Sesiunea browser Metricool nu este un conector backend. Verifică identitatea și starea exactă înaintea oricărei publicări.",
  },
  gsc_credential_unverified: {
    title: "Accesul GSC nu este verificat intern",
    message:
      "Proprietatea este fixată la sc-domain:cutiutamagica.eu, dar tokenul Google readonly nu este confirmat în Seiful de conturi.",
  },
  gsc_data_stale: {
    title: "Datele GSC trebuie reîmprospătate",
    message: "Ultimul import Search Console a depășit pragul de prospețime al agentului.",
  },
  failed_operations: {
    title: "Agentul are operațiuni eșuate",
    message:
      "Există publicări sau schimburi AVYRON eșuate. Verifică jurnalul înaintea unei reîncercări.",
  },
};

export async function processMarketingAgentMonitoring(db: D1Database, now = new Date()) {
  const [settingRow, lastRun] = await Promise.all([
    db
      .prepare("SELECT value_json FROM operational_settings WHERE key = 'agent.marketing_orders'")
      .first<{ value_json: string }>(),
    db
      .prepare(
        `SELECT completed_at
           FROM ai_runs
           WHERE agent_id = 'agent_marketing_orders' AND trigger_type = 'scheduled'
           ORDER BY created_at DESC LIMIT 1`,
      )
      .first<{ completed_at: string | null }>(),
  ]);
  const settings = parseMonitorSettings(settingRow?.value_json ?? null);
  if (!settings.enabled) return { skipped: true, reason: "disabled" as const };

  const lastRunAt = lastRun?.completed_at ? Date.parse(lastRun.completed_at) : Number.NaN;
  if (
    Number.isFinite(lastRunAt) &&
    now.getTime() - lastRunAt < settings.intervalMinutes * 60 * 1_000
  ) {
    return { skipped: true, reason: "interval" as const };
  }

  const expiredApprovals = await expireStaleApprovalRequests(db, now);

  const [social, metricool, google, gsc, failedSocial, failedExchanges, approvals] =
    await Promise.all([
      db
        .prepare("SELECT COUNT(*) AS total FROM social_accounts WHERE status = 'active'")
        .first<{ total: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS total FROM account_connections
           WHERE owner = 'cutiuta_magica' AND provider = 'metricool' AND status = 'active'`,
        )
        .first<{ total: number }>(),
      db
        .prepare("SELECT check_status FROM integration_credentials WHERE provider = 'google'")
        .first<{ check_status: string }>(),
      db
        .prepare(
          `SELECT MAX(imported_at) AS last_imported_at FROM traffic_daily_metrics
           WHERE source = 'gsc' AND property_id = 'sc-domain:cutiutamagica.eu'`,
        )
        .first<{ last_imported_at: string | null }>(),
      db
        .prepare("SELECT COUNT(*) AS total FROM social_posts WHERE status = 'failed'")
        .first<{ total: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS total FROM agent_exchange_items
           WHERE agent_id = 'agent_marketing_orders' AND status IN ('failed','uncertain')`,
        )
        .first<{ total: number }>(),
      db
        .prepare("SELECT COUNT(*) AS total FROM approval_requests WHERE status = 'pending'")
        .first<{ total: number }>(),
    ]);

  const snapshot: MonitorSnapshot = {
    activeSocialAccounts: Number(social?.total ?? 0),
    activeMetricoolConnections: Number(metricool?.total ?? 0),
    googleCredentialStatus: google?.check_status ?? null,
    lastGscImportAt: gsc?.last_imported_at ?? null,
    failedSocialPosts: Number(failedSocial?.total ?? 0),
    failedExchanges: Number(failedExchanges?.total ?? 0),
    pendingApprovals: Number(approvals?.total ?? 0),
  };
  const blockers = evaluateMarketingAgentHealth(snapshot, settings.staleAfterHours, now);
  const runId = crypto.randomUUID();
  const createdAt = now.toISOString();
  const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1_000).toISOString();
  const notificationStatements = blockers.map((blocker) => {
    const copy = blockerCopy[blocker];
    return db
      .prepare(
        `INSERT OR IGNORE INTO admin_notifications (
           id, notification_type, severity, title, message, entity_type, entity_id,
           deduplication_key, action_url, created_at, expires_at
         ) VALUES (?1, 'integration', 'warning', ?2, ?3, 'ai_agent',
           'agent_marketing_orders', ?4, '/admin/ai', ?5, ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        copy.title,
        copy.message,
        `marketing-agent:${blocker}:${bucharestDay(now)}`,
        createdAt,
        expiry,
      );
  });

  await db.batch([
    db
      .prepare(
        `INSERT INTO ai_runs (
           id, agent_id, trigger_type, input_json, output_json, status, token_count,
           estimated_cost_microunits, started_at, completed_at, created_at
         ) VALUES (?1, 'agent_marketing_orders', 'scheduled', ?2, ?3, 'completed',
           0, 0, ?4, ?4, ?4)`,
      )
      .bind(
        runId,
        JSON.stringify({ operation: "flow_monitor", settings }),
        JSON.stringify({ snapshot, blockers, expiredApprovals, externalCalls: 0 }),
        createdAt,
      ),
    ...notificationStatements,
  ]);

  return { skipped: false, runId, snapshot, blockers, expiredApprovals };
}
import { expireStaleApprovalRequests } from "./approval-orchestrator";
