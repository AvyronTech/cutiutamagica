import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
const input = z
  .object({
    variantId: z.string().min(1).max(128),
    expectedVersion: z.number().int().positive(),
    policy: z.enum(["deny", "untracked"]),
    levels: z
      .array(
        z.object({
          locationId: z.string().min(1).max(128),
          version: z.number().int().nonnegative(),
          onHand: z.number().int().min(0).max(1000000),
          safety: z.number().int().min(0).max(1000000),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine((v) => new Set(v.levels.map((l) => l.locationId)).size === v.levels.length);
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function handleAdminInventory(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url),
    match = url.pathname.match(/^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/inventory$/);
  if (!match) return null;
  try {
    const admin = await authenticateAdminRequest(
      request,
      env,
      request.method === "GET" ? "catalog.read" : "catalog.write",
    );
    if (request.method === "GET") {
      const variant = await env.DB.prepare(
        "SELECT id,sku,version,inventory_policy FROM product_variants WHERE product_id=?1 AND status='active' ORDER BY sort_order LIMIT 1",
      )
        .bind(match[1])
        .first();
      if (!variant) return json({ error: { message: "Produsul nu are o variantă activă." } }, 404);
      const levels = await env.DB.prepare(
        "SELECT sl.id AS locationId,sl.name,COALESCE(il.version,0) AS version,COALESCE(il.on_hand_quantity,0) AS onHand,COALESCE(il.reserved_quantity,0) AS reserved,COALESCE(il.safety_stock_quantity,0) AS safety FROM stock_locations sl LEFT JOIN inventory_levels il ON il.location_id=sl.id AND il.variant_id=?1 WHERE sl.active=1 ORDER BY sl.name",
      )
        .bind(variant.id)
        .all();
      return json({ data: { variant, levels: levels.results } });
    }
    if (request.method !== "PATCH") return json({ error: { message: "Metodă nepermisă." } }, 405);
    if (request.headers.get("origin") !== url.origin)
      return json({ error: { message: "Origine nepermisă." } }, 403);
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: { message: "Verifică valorile stocului." } }, 400);
    const d = parsed.data,
      levels = JSON.stringify(d.levels);
    // Validate every row inside the same transaction, including reservation changes made by checkout.
    const gate = env.DB.prepare(
      `UPDATE product_variants SET inventory_policy=?1,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND product_id=?3 AND version=?4 AND status='active' AND NOT EXISTS(SELECT 1 FROM json_each(?5) j LEFT JOIN stock_locations sl ON sl.id=json_extract(j.value,'$.locationId') AND sl.active=1 LEFT JOIN inventory_levels il ON il.variant_id=?2 AND il.location_id=sl.id WHERE sl.id IS NULL OR COALESCE(il.version,0)!=json_extract(j.value,'$.version') OR COALESCE(il.reserved_quantity,0)>json_extract(j.value,'$.onHand'))`,
    ).bind(d.policy, d.variantId, match[1], d.expectedVersion, levels);
    // A unique mutation token prevents a stale writer from borrowing another writer's next version.
    const mutationId = crypto.randomUUID();
    const audit = env.DB.prepare(
      `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) SELECT ?1,?2,?3,'inventory.update','product_variant',?4,?5,'{}' WHERE changes()=1`,
    ).bind(mutationId, admin.id, admin.email, d.variantId, JSON.stringify(d));
    const writes = d.levels.map((l) =>
      env.DB.prepare(
        `INSERT INTO inventory_levels(id,variant_id,location_id,on_hand_quantity,safety_stock_quantity) SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?6) ON CONFLICT(variant_id,location_id) DO UPDATE SET on_hand_quantity=excluded.on_hand_quantity,safety_stock_quantity=excluded.safety_stock_quantity,version=inventory_levels.version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      ).bind(crypto.randomUUID(), d.variantId, l.locationId, l.onHand, l.safety, mutationId),
    );
    const results = await env.DB.batch([gate, audit, ...writes]);
    if (!results[0].meta.changes)
      return json(
        {
          error: {
            message:
              "Stocul s-a schimbat sau cantitatea este sub rezervări. Reîncarcă și verifică din nou.",
          },
        },
        409,
      );
    return json({ data: { saved: true } });
  } catch (e) {
    const status = e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : 500;
    return json({ error: { message: "Stocul nu a putut fi salvat." } }, status);
  }
}
