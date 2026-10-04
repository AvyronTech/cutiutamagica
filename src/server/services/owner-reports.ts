import { previousMonth, reportSettingsSchema } from "@/lib/growth-contracts";
import { readSetting } from "./growth-settings";
import { sendEmail } from "@/server/integrations/resend";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

export async function buildOwnerReport(db: D1Database, now = new Date()) {
  const month = previousMonth(now);
  const start = `${month}-01T00:00:00.000Z`;
  const [year, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, m, 1)).toISOString();
  const results = await db.batch<Record<string, string | number | null>>([
    db
      .prepare(
        `SELECT currency,COUNT(*) AS orders,SUM(total_bani) AS total_bani,
      SUM(CASE WHEN payment_status='paid' THEN total_bani ELSE 0 END) AS paid_bani
      FROM orders WHERE placed_at>=?1 AND placed_at<?2 AND order_status!='cancelled' GROUP BY currency`,
      )
      .bind(start, end),
    db
      .prepare(
        `SELECT oi.product_name,SUM(oi.quantity) AS units FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.placed_at>=?1 AND o.placed_at<?2 AND o.order_status!='cancelled'
      GROUP BY oi.product_name ORDER BY units DESC LIMIT 5`,
      )
      .bind(start, end),
    db
      .prepare(
        `SELECT source,metric,SUM(value) AS value,MAX(imported_at) AS imported_at FROM traffic_daily_metrics
      WHERE day>=?1 AND day<?2 GROUP BY source,metric`,
      )
      .bind(start.slice(0, 10), end.slice(0, 10)),
  ]);
  return {
    month,
    periodTimezone: "UTC",
    sales: results[0].results,
    products: results[1].results,
    traffic: results[2].results,
  };
}

export async function processOwnerReports(env: CommerceEnv, now = new Date()) {
  if (env.APP_ENV !== "production") return;
  const settings = await readSetting(env.DB, "owner_reports", reportSettingsSchema);
  if (!settings.enabled) return;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (day < settings.day || (day === settings.day && hour < settings.hour)) return;
  const owners = await env.DB.prepare(
    `SELECT DISTINCT lower(au.email) AS email FROM admin_users au
     JOIN admin_user_roles ur ON ur.admin_user_id=au.id JOIN roles r ON r.id=ur.role_id
     WHERE r.code='owner' AND au.status!='suspended'`,
  ).all<{ email: string }>();
  const recipients = settings.recipients.filter((email) =>
    owners.results.some((o) => o.email === email),
  );
  if (!recipients.length) return;
  const report = await buildOwnerReport(env.DB, now);
  const money = (value: unknown, currency: unknown) =>
    `${(Number(value ?? 0) / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const body = [
    `Perioadă: ${report.month} (${report.periodTimezone})`,
    ...(settings.sales
      ? [
          "\nVânzări",
          ...report.sales.map(
            (r) =>
              `${r.currency}: ${r.orders} comenzi; valoare ${money(r.total_bani, r.currency)}; încasat ${money(r.paid_bani, r.currency)}.`,
          ),
          ...(report.sales.length ? [] : ["Nu există comenzi în această perioadă."]),
        ]
      : []),
    ...(settings.products
      ? [
          "\nCele mai comandate produse",
          ...report.products.map((r) => `${r.product_name}: ${r.units} bucăți.`),
          ...(report.products.length ? [] : ["Nu există produse comandate în această perioadă."]),
        ]
      : []),
    ...(settings.traffic
      ? [
          "\nTrafic importat",
          ...report.traffic.map(
            (r) => `${r.source} / ${r.metric}: ${r.value}; ultima importare ${r.imported_at}.`,
          ),
          ...(report.traffic.length ? [] : ["Nu există date importate în această perioadă."]),
        ]
      : []),
  ].join("\n");
  for (const recipient of recipients) {
    const id = `${report.month}/${recipient}`;
    const stamp = now.toISOString();
    // Keep uncertain sends within Resend's idempotency retention; older cases require review.
    await env.DB.prepare(
      `UPDATE owner_report_deliveries SET status='review_required' WHERE id=?1 AND status!='sent' AND first_attempt_at<?2`,
    )
      .bind(id, new Date(now.getTime() - 23 * 3600000).toISOString())
      .run();
    const claim = await env.DB.prepare(
      `INSERT INTO owner_report_deliveries(id,month,recipient,status,first_attempt_at,updated_at)
      VALUES(?1,?2,?3,'processing',?4,?4) ON CONFLICT(month,recipient) DO UPDATE SET
      status='processing',attempts=attempts+1,updated_at=excluded.updated_at
      WHERE owner_report_deliveries.status IN ('failed','processing') AND owner_report_deliveries.updated_at<?5 AND attempts<5
      RETURNING id`,
    )
      .bind(id, report.month, recipient, stamp, new Date(now.getTime() - 15 * 60000).toISOString())
      .first();
    if (!claim) continue;
    try {
      const text = `Raport lunar Cutiuța Magică: ${report.month}\nSinteză operațională, valori separate pe monedă; nu înlocuiește documentele contabile.\n\n${body}`;
      await sendEmail(env, {
        to: recipient,
        subject: `Cutiuța Magică | Raport ${report.month}`,
        text,
        html: `<div style="font-family:system-ui;max-width:680px;margin:auto"><h1>Raport lunar</h1><pre style="white-space:pre-wrap">${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre></div>`,
        idempotencyKey: `owner-report/${id}`,
        entityType: "owner_report",
        entityId: id,
      });
      await env.DB.prepare(
        "UPDATE owner_report_deliveries SET status='sent',updated_at=?2,last_error=NULL WHERE id=?1",
      )
        .bind(id, stamp)
        .run();
    } catch {
      await env.DB.prepare(
        "UPDATE owner_report_deliveries SET status='failed',updated_at=?2,last_error='Trimitere nereușită; verifică Resend și domeniul expeditor.' WHERE id=?1",
      )
        .bind(id, stamp)
        .run();
    }
  }
}
