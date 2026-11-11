import { authenticationColumn, backupColumns, backupTableQuery } from "./backup-projection";
import type { BackupPolicy } from "@/lib/operations-contracts";

const EXCLUDED_TABLES = new Set([
  "admin_sessions",
  "review_accounts",
  "review_sessions",
  "admin_password_credentials",
  "customer_login_challenges",
  "review_rate_limits",
  "security_rate_limits",
  "ai_runner_nonces",
  "security_service_identities",
  "integration_credentials",
  "push_subscriptions",
  "chat_conversations",
  "idempotency_keys",
  "media_upload_sessions",
]);
const CUSTOMER_TABLES = new Set([
  "admin_users",
  "admin_login_events",
  "email_messages",
  "email_contacts",
  "shipments",
  "newsletter_subscribers",
  "email_suppression_entries",
  "review_accounts",
  "audit_log",
  "business_activity",
  "security_events",
  "cart_items",
  "carts",
  "chat_conversations",
  "chat_messages",
  "consent_events",
  "customer_addresses",
  "customers",
  "newsletter_subscribers",
  "order_addresses",
  "order_events",
  "order_items",
  "order_notes",
  "order_risk_assessments",
  "order_tags",
  "orders",
  "marketplace_financial_entries",
  "trendyol_sync_issues",
  "emag_order_sources",
  "emag_sync_issues",
  "marketplace_invoice_deliveries",
  "invoices",
  "invoice_lines",
  "business_documents",
  "payment_attempts",
  "refunds",
  "return_request_items",
  "return_requests",
  "shipments",
]);
const ROW_LIMIT = 5_000;

type BackupSchemaRow = { name: string; sql: string };
async function readBackupSchema(db: D1Database) {
  return (
    await db
      .prepare(
        `SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name`,
      )
      .all<BackupSchemaRow>()
  ).results;
}
export async function listBackupTables(
  db: D1Database,
  includeCustomerData = true,
): Promise<string[]> {
  return selectBackupTables(await readBackupSchema(db), includeCustomerData);
}
function selectBackupTables(rows: BackupSchemaRow[], includeCustomerData: boolean): string[] {
  const sensitive = new Set(CUSTOMER_TABLES);
  // Follow schema references so future customer-related tables inherit the exclusion.
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (sensitive.has(row.name)) continue;
      const parents = [...(row.sql || "").matchAll(/REFERENCES\s+["`[]?([a-z0-9_]+)/gi)].map((m) =>
        m[1].toLowerCase(),
      );
      if (parents.some((name) => sensitive.has(name))) {
        sensitive.add(row.name);
        changed = true;
      }
    }
  }
  return rows
    .map((row) => row.name)
    .filter(
      (name) =>
        /^[a-z][a-z0-9_]*$/.test(name) &&
        !EXCLUDED_TABLES.has(name) &&
        (includeCustomerData || !sensitive.has(name)),
    );
}

async function gzipJson(value: unknown): Promise<ArrayBuffer> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

export async function readBackupPolicy(db: D1Database): Promise<BackupPolicy> {
  const row = await db.prepare("SELECT * FROM backup_policies WHERE id='default'").first<{
    enabled: number;
    frequency: BackupPolicy["frequency"];
    weekday: number;
    hour: number;
    retention_count: number;
    max_age_days: number;
    include_customer_data: number;
  }>();
  if (!row) throw new Error("Politica de backup nu este inițializată.");
  return {
    enabled: row.enabled === 1,
    frequency: row.frequency,
    weekday: row.weekday,
    hour: row.hour,
    retentionCount: row.retention_count,
    maxAgeDays: row.max_age_days,
    includeCustomerData: row.include_customer_data === 1,
  };
}

export async function createApplicationBackup(
  env: Pick<Env, "DB" | "MEDIA">,
  triggerType: "manual" | "scheduled",
  actorId: string | null,
): Promise<{ id: string; status: "completed" | "partial"; r2Key: string; sizeBytes: number }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const policy = await readBackupPolicy(env.DB);
  await env.DB.prepare(
    `INSERT INTO backup_runs(id,trigger_type,status,requested_by,created_at)
     VALUES(?1,?2,'running',?3,?4)`,
  )
    .bind(id, triggerType, actorId, now)
    .run();

  try {
    const tables: Record<string, unknown[]> = {};
    const truncated: string[] = [];
    const skipped: string[] = [];
    const redactedColumns: Record<string, string[]> = {};
    const schemas = await readBackupSchema(env.DB);
    const backupTables = selectBackupTables(schemas, policy.includeCustomerData);
    const queries: Array<{ name: string; sql: string }> = [];
    for (const table of backupTables) {
      try {
        const columns = backupColumns(schemas.find((row) => row.name === table)?.sql || "");
        redactedColumns[table] = columns.filter((column) => authenticationColumn.test(column));
        const safeColumns = columns.filter((column) => !authenticationColumn.test(column));
        queries.push({ name: table, sql: backupTableQuery(table, safeColumns, ROW_LIMIT + 1) });
      } catch {
        skipped.push(table);
      }
    }
    // At most 40 bounded data queries + metadata/status/retention. Stay below Free's 50 reads.
    // UNION returns separate rows, avoiding a single aggregated cell above D1's 2 MB row limit.
    const groups: Array<Array<{ name: string; sql: string }>> = [];
    for (const query of queries) {
      const last = groups[groups.length - 1];
      if (
        !last ||
        last.length >= 6 ||
        last.reduce((n, q) => n + q.sql.length, 0) + query.sql.length > 80_000
      )
        groups.push([query]);
      else last.push(query);
    }
    if (groups.length > 40)
      throw new Error(
        "Schema depășește bugetul exportului Free. Folosește recuperarea D1 și exportul administrativ separat.",
      );
    for (const group of groups) {
      try {
        const result = await env.DB.prepare(group.map((q) => q.sql).join(" UNION ALL ")).all<{
          table_name: string;
          row_json: string;
        }>();
        for (const query of group) tables[query.name] = [];
        for (const row of result.results) {
          if (!group.some((q) => q.name === row.table_name))
            throw new Error("Invalid backup result.");
          const target = tables[row.table_name];
          if (target.length < ROW_LIMIT) target.push(JSON.parse(row.row_json));
          else if (!truncated.includes(row.table_name)) truncated.push(row.table_name);
        }
      } catch {
        for (const query of group) {
          delete tables[query.name];
          skipped.push(query.name);
        }
      }
    }
    const manifest = {
      format: "cutiuta-magica-application-backup/v2",
      excludesAuthenticationMaterial: true,
      redactedColumns,
      createdAt: now,
      schemaVersion: (
        tables.schema_metadata as Array<{ key?: string; value?: string }> | undefined
      )?.find((item) => item.key === "schema_version")?.value,
      rowLimitPerTable: ROW_LIMIT,
      tables: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
      truncated,
      skipped,
      includesCustomerData: policy.includeCustomerData,
      note: "R2 media files are not duplicated; this snapshot contains application and media metadata.",
    };
    const payload = await gzipJson({ manifest, tables });
    const key = `backups/application/${now.slice(0, 10)}/${id}.json.gz`;
    await env.MEDIA.put(key, payload, {
      httpMetadata: { contentType: "application/gzip" },
      customMetadata: { backupId: id, format: "application-v2" },
    });
    const status = truncated.length || skipped.length ? "partial" : "completed";
    await env.DB.prepare(
      `UPDATE backup_runs SET status=?2,r2_key=?3,manifest_json=?4,size_bytes=?5,
       table_count=?6,completed_at=?7,error_message=?8 WHERE id=?1`,
    )
      .bind(
        id,
        status,
        key,
        JSON.stringify(manifest),
        payload.byteLength,
        Object.keys(tables).length,
        new Date().toISOString(),
        status === "partial"
          ? `Export parțial: ${skipped.length} tabele omise, ${truncated.length} tabele cu limită de rânduri. Folosește D1 Time Travel pentru recuperare completă.`
          : null,
      )
      .run();
    await enforceBackupRetention(env, policy);
    return { id, status, r2Key: key, sizeBytes: payload.byteLength };
  } catch (error) {
    await env.DB.prepare(
      "UPDATE backup_runs SET status='failed',error_message=?2,completed_at=?3 WHERE id=?1",
    )
      .bind(
        id,
        error instanceof Error ? error.message.slice(0, 1000) : "Backup failed",
        new Date().toISOString(),
      )
      .run();
    throw error;
  }
}

async function enforceBackupRetention(
  env: Pick<Env, "DB" | "MEDIA">,
  policy: BackupPolicy,
): Promise<void> {
  const runs = await env.DB.prepare(
    `SELECT id,r2_key AS r2Key,created_at AS createdAt FROM backup_runs
     WHERE is_baseline=0 AND status IN ('completed','partial') ORDER BY created_at DESC`,
  ).all<{ id: string; r2Key: string | null; createdAt: string }>();
  const maxAge = Date.now() - policy.maxAgeDays * 86_400_000;
  const expired = runs.results.filter(
    (run, index) => index >= policy.retentionCount || Date.parse(run.createdAt) < maxAge,
  );
  for (const run of expired.slice(0, 1)) {
    if (run.r2Key) await env.MEDIA.delete(run.r2Key);
    await env.DB.prepare("DELETE FROM backup_runs WHERE id=?1 AND is_baseline=0")
      .bind(run.id)
      .run();
  }
}

export async function processScheduledBackup(env: Pick<Env, "DB" | "MEDIA">): Promise<void> {
  const policy = await readBackupPolicy(env.DB);
  if (!policy.enabled || policy.frequency === "manual") return;
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Bucharest",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  if (
    Number(parts.hour) !== policy.hour ||
    (policy.frequency === "weekly" && weekday !== policy.weekday)
  )
    return;
  const latest = await env.DB.prepare(
    "SELECT created_at FROM backup_runs WHERE trigger_type='scheduled' ORDER BY created_at DESC LIMIT 1",
  ).first<{ created_at: string }>();
  if (latest && Date.now() - Date.parse(latest.created_at) < 20 * 60 * 60 * 1000) return;
  await createApplicationBackup(env, "scheduled", null);
}
