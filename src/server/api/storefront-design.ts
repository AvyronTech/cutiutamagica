import { boundedJson } from "./bounded-json";
import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { productScene, productSceneSchema } from "@/lib/product-themes";
import { storefrontMessageSchema } from "@/lib/storefront-messages";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
const columns =
  "id,title,message,placement,link,label,delay_seconds AS delaySeconds,scroll_percent AS scrollPercent,enabled,version";
export async function handleStorefrontDesign(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url),
    path = url.pathname;
  const sceneMatch = path.match(/^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/scene$/);
  const publicMessages = path === "/api/v1/storefront/messages",
    adminMessages = path === "/api/v1/admin/storefront/messages";
  if (!sceneMatch && !publicMessages && !adminMessages) return null;
  try {
    if (publicMessages) {
      if (request.method !== "GET") return json({ error: { message: "Metodă nepermisă." } }, 405);
      const rows = await env.DB.prepare(
        `SELECT ${columns} FROM storefront_messages WHERE enabled=1 ORDER BY updated_at DESC LIMIT 20`,
      ).all();
      return json({ data: rows.results });
    }
    const admin = await authenticateAdminRequest(
      request,
      env,
      request.method === "GET" ? "catalog.read" : sceneMatch ? "catalog.write" : "content.write",
    );
    if (request.method === "GET") {
      if (sceneMatch) {
        const p = await env.DB.prepare("SELECT slug FROM products WHERE id=?1")
          .bind(sceneMatch[1])
          .first<{ slug: string }>();
        if (!p) return json({ error: { message: "Produs inexistent." } }, 404);
        const row = await env.DB.prepare(
          "SELECT scene,accent,occasion,version FROM product_scenes WHERE product_id=?1",
        )
          .bind(sceneMatch[1])
          .first();
        return json({ data: { ...productScene(p.slug, row), version: row?.version ?? 0 } });
      }
      return json({
        data: (
          await env.DB.prepare(
            `SELECT ${columns} FROM storefront_messages ORDER BY updated_at DESC LIMIT 100`,
          ).all()
        ).results,
      });
    }
    if (request.method !== "PUT") return json({ error: { message: "Metodă nepermisă." } }, 405);
    if (request.headers.get("origin") !== url.origin)
      return json({ error: { message: "Origine nepermisă." } }, 403);
    if (Number(request.headers.get("content-length") || 0) > 8192)
      return json({ error: { message: "Cerere prea mare." } }, 413);
    const body = await boundedJson(request, 8192);
    let statement: D1PreparedStatement;
    let entity: string;
    if (sceneMatch) {
      const parsed = productSceneSchema
        .extend({ expectedVersion: z.number().int().nonnegative() })
        .safeParse(body);
      if (!parsed.success)
        return json({ error: { message: "Verifică scena, culoarea și textul." } }, 400);
      const d = parsed.data;
      entity = sceneMatch[1];
      statement = env.DB.prepare(
        `INSERT INTO product_scenes(product_id,scene,accent,occasion) SELECT ?1,?2,?3,?4 WHERE ?5=0 AND EXISTS(SELECT 1 FROM products WHERE id=?1) OR EXISTS(SELECT 1 FROM product_scenes WHERE product_id=?1 AND version=?5) ON CONFLICT(product_id) DO UPDATE SET scene=excluded.scene,accent=excluded.accent,occasion=excluded.occasion,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE version=?5`,
      ).bind(entity, d.scene, d.accent, d.occasion, d.expectedVersion);
    } else {
      const parsed = storefrontMessageSchema.safeParse(body);
      if (!parsed.success)
        return json({ error: { message: "Verifică textul și destinația publică." } }, 400);
      const d = parsed.data;
      entity = d.id;
      statement = env.DB.prepare(
        `INSERT INTO storefront_messages(id,title,message,placement,link,label,delay_seconds,scroll_percent,enabled) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9 WHERE ?10=0 OR EXISTS(SELECT 1 FROM storefront_messages WHERE id=?1 AND version=?10) ON CONFLICT(id) DO UPDATE SET title=excluded.title,message=excluded.message,placement=excluded.placement,link=excluded.link,label=excluded.label,delay_seconds=excluded.delay_seconds,scroll_percent=excluded.scroll_percent,enabled=excluded.enabled,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE version=?10`,
      ).bind(
        d.id,
        d.title,
        d.message,
        d.placement,
        d.link,
        d.label,
        d.delaySeconds,
        d.scrollPercent,
        Number(d.enabled),
        d.expectedVersion,
      );
    }
    const result = await env.DB.batch([
      statement,
      env.DB.prepare(
        "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) SELECT ?1,?2,?3,'storefront.design.update',?4,?5,?6,'{}' WHERE changes()=1",
      ).bind(
        crypto.randomUUID(),
        admin.id,
        admin.email,
        sceneMatch ? "product_scene" : "storefront_message",
        entity,
        JSON.stringify(body),
      ),
    ]);
    return result[0].meta.changes
      ? json({ data: { saved: true } })
      : json({ error: { message: "Datele s-au schimbat. Reîncarcă înainte de salvare." } }, 409);
  } catch (e) {
    return json(
      { error: { message: "Nu am putut accesa configurarea." } },
      e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : 500,
    );
  }
}
