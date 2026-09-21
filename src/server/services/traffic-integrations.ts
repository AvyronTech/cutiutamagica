import { z } from "zod";
import { trafficSettingsSchema, type CredentialProvider } from "@/lib/growth-contracts";
import { credential, readSetting } from "./growth-settings";
import {
  fetchWithTimeout,
  readProviderJson,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";

export async function checkConnection(env: CommerceEnv, provider: CredentialProvider) {
  const key = await credential(env, provider);
  if (!key) throw new Error("Cheia sau tokenul nu este configurat.");
  const endpoints: Partial<Record<CredentialProvider, string>> = {
    smartship: "https://api.smartship.ro/account/balance",
    stripe: "https://api.stripe.com/v1/account",
    revolut: "https://b2b.revolut.com/api/1.0/accounts",
    resend: "https://api.resend.com/domains",
    google: "https://www.googleapis.com/webmasters/v3/sites",
  };
  const endpoint = endpoints[provider];
  if (!endpoint)
    return {
      ok: false,
      message:
        "Verificarea se face prin prima căutare, import sau cotație reușită. Cheia este salvată, conexiunea încă neverificată.",
    };
  const response = await fetchWithTimeout(endpoint, {
    headers: provider === "smartship" ? { "x-api-key": key } : { authorization: `Bearer ${key}` },
    redirect: "error",
  });
  const payload = await readProviderJson(response).catch(() => null);
  const ok =
    response.ok &&
    payload != null &&
    (provider !== "smartship" || z.object({ status: z.literal(200) }).safeParse(payload).success);
  await env.DB.prepare(
    "UPDATE integration_credentials SET checked_at=?2,check_status=?3 WHERE provider=?1",
  )
    .bind(provider, new Date().toISOString(), ok ? "verified" : "failed")
    .run();
  return {
    ok,
    message: ok
      ? "Acces API verificat. Activarea serviciilor se configurează separat."
      : `Conexiune nereușită (HTTP ${response.status}). Verifică permisiunile și valabilitatea tokenului.`,
  };
}
const gaResponse = z.object({
  rows: z
    .array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })),
        metricValues: z.array(z.object({ value: z.string() })),
      }),
    )
    .max(100)
    .optional(),
});
const gscResponse = z.object({
  rows: z
    .array(
      z.object({
        keys: z.array(z.string()),
        clicks: z.number().nonnegative(),
        impressions: z.number().nonnegative(),
      }),
    )
    .max(100)
    .optional(),
});
export async function syncTraffic(env: CommerceEnv, source: "ga4" | "gsc") {
  const settings = await readSetting(env.DB, "traffic", trafficSettingsSchema);
  const key = await credential(env, "google");
  if (!key)
    throw new Error("Configurează tokenul Google cu acces readonly la proprietățile selectate.");
  const property = source === "ga4" ? settings.gaPropertyId : settings.gscProperty;
  if (!property) throw new Error("Salvează identificatorul proprietății înainte de import.");
  const now = new Date(),
    endDate = new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10),
    startDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const url =
    source === "ga4"
      ? `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`
      : `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const body =
    source === "ga4"
      ? {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
          limit: 100,
        }
      : { startDate, endDate, dimensions: ["date"], rowLimit: 100, dataState: "final" };
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Import Google nereușit (HTTP ${response.status}). Tokenul poate fi expirat sau fără permisiuni.`,
    );
  const data = await readProviderJson(response);
  const metrics: Array<{ day: string; metric: string; value: number }> = [];
  if (source === "ga4")
    for (const row of gaResponse.parse(data).rows ?? []) {
      const raw = row.dimensionValues[0]?.value ?? "";
      const day = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      ["sessions", "page_views"].forEach((metric, i) =>
        metrics.push({ day, metric, value: Number(row.metricValues[i]?.value) }),
      );
    }
  else
    for (const row of gscResponse.parse(data).rows ?? []) {
      metrics.push(
        { day: row.keys[0], metric: "clicks", value: row.clicks },
        { day: row.keys[0], metric: "impressions", value: row.impressions },
      );
    }
  if (
    metrics.some(
      (m) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(m.day) ||
        m.day < startDate ||
        m.day > endDate ||
        !Number.isFinite(m.value) ||
        m.value < 0,
    )
  )
    throw new Error("Răspuns Google invalid.");
  const stamp = now.toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM traffic_daily_metrics WHERE source=?1 AND property_id=?2 AND day BETWEEN ?3 AND ?4",
    ).bind(source, property, startDate, endDate),
    ...metrics.map((m) =>
      env.DB.prepare(
        "INSERT INTO traffic_daily_metrics(source,property_id,day,metric,value,imported_at) VALUES(?1,?2,?3,?4,?5,?6)",
      ).bind(source, property, m.day, m.metric, m.value, stamp),
    ),
  ]);
  return { count: metrics.length, updatedAt: stamp };
}
