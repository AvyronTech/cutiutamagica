import type { PublicShippingPolicy } from "@/lib/shipping-seo";

export async function readPublicShippingPolicy(
  db: D1Database,
): Promise<PublicShippingPolicy | null> {
  const row = await db
    .prepare(
      `SELECT currency,free_over_bani,easybox_enabled,allowed_countries_json,validation_status
     FROM shipping_policy_configs WHERE code='RO_STANDARD'`,
    )
    .first<{
      currency: string;
      free_over_bani: number | null;
      easybox_enabled: number;
      allowed_countries_json: string;
      validation_status: string;
    }>();
  if (!row || row.validation_status !== "verified" || row.currency !== "RON") return null;
  try {
    const countries: unknown = JSON.parse(row.allowed_countries_json);
    if (!Array.isArray(countries) || !countries.includes("RO")) return null;
  } catch {
    return null;
  }
  const freeOver = row.free_over_bani;
  return {
    country: "RO",
    currency: "RON",
    freeOverRon:
      freeOver != null && Number.isSafeInteger(freeOver) && freeOver >= 0 ? freeOver / 100 : null,
    easybox: row.easybox_enabled === 1,
  };
}
