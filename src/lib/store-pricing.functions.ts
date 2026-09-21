import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { listPublicCatalog } from "@/server/db/catalog.repository";
export const getStorePricing = createServerFn({ method: "GET" }).handler(async () => {
  const catalog = await listPublicCatalog(env.DB);
  const promotion = await env.DB.prepare(
    `SELECT p.value,CAST(pr.value_json AS INTEGER) AS min_quantity FROM promotions p
    JOIN promotion_rules pr ON pr.promotion_id=p.id AND pr.rule_type='min_quantity' AND pr.operator='gte'
    WHERE p.id='promotion_website_volume_2' AND p.status='active'
    AND (p.starts_at IS NULL OR p.starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    AND (p.ends_at IS NULL OR p.ends_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
  ).first<{ value: number; min_quantity: number }>();
  return {
    catalog,
    promotion: promotion
      ? { unitPrice: promotion.value / 100, minQuantity: promotion.min_quantity }
      : null,
  };
});
