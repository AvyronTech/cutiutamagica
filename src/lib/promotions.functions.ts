import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";
import { activity } from "@/server/services/growth-settings";
const money = z
  .number()
  .finite()
  .min(0.01)
  .max(100000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Maximum două zecimale");
export const productPriceInput = z
  .object({
    id: z.string().min(1).max(100),
    previousPriceBani: z.number().int().nonnegative(),
    price: money,
    referencePrice: money.nullable(),
    evidence: z.string().trim().max(1500),
    confirmed: z.boolean(),
  })
  .superRefine((v, c) => {
    if (
      v.referencePrice !== null &&
      (v.referencePrice <= v.price || !v.confirmed || v.evidence.length < 20)
    )
      c.addIssue({
        code: "custom",
        message:
          "Pentru reducere confirmă prețul anterior minim din 30 zile și documentează sursa (minimum 20 caractere).",
      });
  });
function origin() {
  const req = getRequest();
  if (req.headers.get("origin") !== new URL(req.url).origin) throw new Error("Origine nepermisă.");
}
export const getPromotionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "promotions.read");
    const prices = await env.DB.prepare(
      `SELECT pi.id,p.name,pv.sku,pi.price_bani,pi.compare_at_bani,pl.currency,pre.evidence
    FROM price_list_items pi JOIN price_lists pl ON pl.id=pi.price_list_id JOIN sales_channels sc ON sc.id=pl.channel_id
    JOIN product_variants pv ON pv.id=pi.variant_id JOIN products p ON p.id=pv.product_id
    LEFT JOIN price_reference_evidence pre ON pre.price_item_id=pi.id
    WHERE p.product_type='music_box' AND sc.code='website' AND pl.status='active' AND pi.min_quantity=1 ORDER BY p.name`,
    ).all<Record<string, string | number | null>>();
    const promotion = await env.DB.prepare(
      "SELECT p.status,p.value,pr.value_json AS min_quantity FROM promotions p JOIN promotion_rules pr ON pr.promotion_id=p.id WHERE p.id='promotion_website_volume_2' AND pr.rule_type='min_quantity'",
    ).first<{ status: string; value: number; min_quantity: string }>();
    return { prices: prices.results, promotion };
  });
export const saveProductPrice = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(productPriceInput)
  .handler(async ({ context, data }) => {
    origin();
    assertPermission(context.admin, "promotions.write");
    const row = await env.DB.prepare(
      "SELECT pi.price_bani,pre.reference_bani FROM price_list_items pi LEFT JOIN price_reference_evidence pre ON pre.price_item_id=pi.id WHERE pi.id=?1",
    )
      .bind(data.id)
      .first<{ price_bani: number; reference_bani: number | null }>();
    if (!row || row.price_bani !== data.previousPriceBani)
      throw new Error("Prețul a fost modificat. Reîncarcă pagina.");
    const now = new Date().toISOString(),
      price = Math.round(data.price * 100),
      reference = data.referencePrice === null ? null : Math.round(data.referencePrice * 100);
    const minimum = await env.DB.prepare(
      "SELECT MIN(MIN(old_price_bani,new_price_bani)) AS value FROM price_change_history WHERE price_item_id=?1 AND changed_at>=?2",
    )
      .bind(data.id, new Date(Date.now() - 30 * 86400000).toISOString())
      .first<{ value: number | null }>();
    if (
      reference !== null &&
      !(price === row.price_bani && reference === row.reference_bani) &&
      reference > Math.min(row.price_bani, minimum?.value ?? row.price_bani)
    )
      throw new Error("Prețul de referință depășește un preț cunoscut din ultimele 30 zile.");
    const historyId = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO price_change_history(id,price_item_id,old_price_bani,new_price_bani,changed_by,changed_at) SELECT ?1,id,price_bani,?3,?4,?5 FROM price_list_items WHERE id=?2 AND price_bani=?6",
      ).bind(historyId, data.id, price, context.admin.id, now, row.price_bani),
      env.DB.prepare(
        "UPDATE price_list_items SET price_bani=?2,compare_at_bani=?3,updated_at=?4 WHERE id=?1 AND price_bani=?5",
      ).bind(data.id, price, reference, now, row.price_bani),
      env.DB.prepare(
        "DELETE FROM price_reference_evidence WHERE price_item_id=?1 AND EXISTS(SELECT 1 FROM price_change_history WHERE id=?2)",
      ).bind(data.id, historyId),
      ...(reference === null
        ? []
        : [
            env.DB.prepare(
              "INSERT INTO price_reference_evidence(price_item_id,reference_bani,evidence,approved_by,approved_at) SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM price_change_history WHERE id=?6)",
            ).bind(data.id, reference, data.evidence, context.admin.id, now, historyId),
          ]),
      env.DB.prepare(
        "INSERT INTO business_activity(id,actor_id,action,entity_id,created_at) SELECT ?1,?2,'product.price_updated',?3,?4 WHERE EXISTS(SELECT 1 FROM price_change_history WHERE id=?5)",
      ).bind(crypto.randomUUID(), context.admin.id, data.id, now, historyId),
    ]);
    if (!results[1].meta.changes)
      throw new Error("Prețul a fost modificat simultan. Reîncarcă pagina.");
    return { ok: true };
  });
export const saveVolumePromotion = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      active: z.boolean(),
      unitPrice: money,
      minQuantity: z.number().int().min(2).max(40),
    }),
  )
  .handler(async ({ context, data }) => {
    origin();
    assertPermission(context.admin, "promotions.write");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE promotions SET status=?1,value=?2,updated_at=?3 WHERE id='promotion_website_volume_2'",
      ).bind(
        data.active ? "active" : "paused",
        Math.round(data.unitPrice * 100),
        new Date().toISOString(),
      ),
      env.DB.prepare(
        "UPDATE promotion_rules SET value_json=?1 WHERE promotion_id='promotion_website_volume_2' AND rule_type='min_quantity'",
      ).bind(String(data.minQuantity)),
      activity(env.DB, context.admin.id, "promotion.updated", "promotion_website_volume_2"),
    ]);
    return { ok: true };
  });
