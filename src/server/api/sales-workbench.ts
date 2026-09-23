import { boundedJson } from "./bounded-json";
import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import {
  salesChannelCodes,
  salesChannelDefinitions,
  validChannelUrl,
  type SalesChannelCode,
} from "@/lib/sales-channels";
import { listPublicCatalog, type CatalogProduct } from "@/server/db/catalog.repository";
import { digestHex } from "@/server/integrations/provider-runtime";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
const channelSchema = z.enum(["google_merchant", "emag", "trendyol", "okazii", "olx", "vinted"]);
const escapeXml = (v: unknown) =>
  String(v ?? "").replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export function googleCatalogFeed(products: CatalogProduct[]) {
  const eligible = products.filter(
    (p) => p.price != null && p.price > 0 && p.imageUrl && p.name && p.description,
  );
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Cutiuța Magică</title><link>https://cutiutamagica.eu</link><description>Cutiuțe muzicale cu manivelă</description>${eligible
    .map((p) => {
      const item: Record<string, unknown> = {
        id: p.sku || p.slug,
        title: p.name,
        description: p.description,
        link: `https://cutiutamagica.eu/produs/${p.slug}`,
        image_link: p.imageUrl!.startsWith("https://")
          ? p.imageUrl
          : `https://cutiutamagica.eu${p.imageUrl}`,
        availability: p.availability === "available" ? "in_stock" : "out_of_stock",
        price: `${p.price!.toFixed(2)} RON`,
        condition: "new",
        product_type: p.category,
      };
      return `<item>${Object.entries(item)
        .map(([k, v]) => `<g:${k}>${escapeXml(v)}</g:${k}>`)
        .join("")}</item>`;
    })
    .join("")}</channel></rss>`;
}
function publicSnapshot(p: CatalogProduct) {
  return {
    name: p.name,
    description: p.description,
    price: p.price,
    availability: p.availability,
    imageUrl: p.imageUrl,
    gallery: p.gallery,
    sku: p.sku,
    url: `https://cutiutamagica.eu/produs/${p.slug}`,
  };
}
async function hash(value: unknown) {
  return digestHex("SHA-256", JSON.stringify(value));
}
type Draft = {
  title: string;
  description: string;
  listing_url: string;
  status: string;
  version: number;
  published_catalog_hash: string | null;
  published_at: string | null;
};
const audit = (
  env: Env,
  actor: { id: string; email: string },
  entity: string,
  action: string,
  payload: unknown,
) =>
  env.DB.prepare(
    "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) SELECT ?1,?2,?3,?4,'sales_workbench',?5,?6,'{}' WHERE changes()=1",
  ).bind(crypto.randomUUID(), actor.id, actor.email, action, entity, JSON.stringify(payload));
export async function handleSalesWorkbench(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url),
    path = url.pathname,
    feed = path === "/api/v1/catalog/google.xml",
    profiles = path === "/api/v1/admin/sales-channels";
  const match = path.match(/^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/sales-channels$/);
  if (!feed && !profiles && !match) return null;
  try {
    if (feed) {
      if (request.method !== "GET") return json({ error: { message: "Metodă nepermisă." } }, 405);
      return new Response(googleCatalogFeed(await listPublicCatalog(env.DB)), {
        headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" },
      });
    }
    const admin = await authenticateAdminRequest(
      request,
      env,
      request.method === "GET" ? "integrations.read" : "integrations.write",
    );
    const catalog = match ? await listPublicCatalog(env.DB) : [];
    const product = match ? catalog.find((p) => p.id === match[1]) : undefined;
    if (match && !product)
      return json(
        {
          error: {
            message: "Publică produsul în catalogul central înainte de pregătirea anunțurilor.",
          },
        },
        404,
      );
    if (request.method === "GET") {
      if (profiles)
        return json({
          data: (
            await env.DB.prepare(
              "SELECT code,account_url AS accountUrl,seller_id AS sellerId,data_source_id AS dataSourceId,version FROM sales_channel_profiles",
            ).all()
          ).results,
        });
      const drafts = (
        await env.DB.prepare("SELECT * FROM product_channel_drafts WHERE product_id=?1")
          .bind(match![1])
          .all<Draft & { channel_code: string }>()
      ).results;
      const snapshot = publicSnapshot(product!),
        catalogHash = await hash(snapshot);
      return json({
        data: {
          product: snapshot,
          catalogHash,
          channels: salesChannelCodes.map((code) => {
            const d = drafts.find((d) => d.channel_code === code);
            return {
              code,
              title: d?.title || product!.name,
              description: d?.description || product!.description,
              listingUrl: d?.listing_url || "",
              status: d?.status || "draft",
              version: d?.version ?? 0,
              publishedAt: d?.published_at,
              needsUpdate: Boolean(
                d?.published_catalog_hash && d.published_catalog_hash !== catalogHash,
              ),
            };
          }),
        },
      });
    }
    if (request.method !== "PUT" && request.method !== "POST")
      return json({ error: { message: "Metodă nepermisă." } }, 405);
    if (request.headers.get("origin") !== url.origin)
      return json({ error: { message: "Origine nepermisă." } }, 403);
    if (Number(request.headers.get("content-length") || 0) > 32768)
      return json({ error: { message: "Cerere prea mare." } }, 413);
    const body = await boundedJson(request, 32768);
    if (profiles) {
      const parsed = z
        .object({
          code: channelSchema,
          accountUrl: z.string().max(500),
          sellerId: z.string().regex(/^[a-zA-Z0-9_-]{0,100}$/),
          dataSourceId: z.string().regex(/^\d{0,30}$/),
          expectedVersion: z.number().int().nonnegative(),
        })
        .safeParse(body);
      if (!parsed.success || !validChannelUrl(parsed.data.code, parsed.data.accountUrl))
        return json(
          { error: { message: "Verifică datele contului și domeniul platformei." } },
          400,
        );
      const d = parsed.data;
      const results = await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO sales_channel_profiles(code,account_url,seller_id,data_source_id) SELECT ?1,?2,?3,?4 WHERE ?5=0 OR EXISTS(SELECT 1 FROM sales_channel_profiles WHERE code=?1 AND version=?5) ON CONFLICT(code) DO UPDATE SET account_url=excluded.account_url,seller_id=excluded.seller_id,data_source_id=excluded.data_source_id,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE version=?5`,
        ).bind(d.code, d.accountUrl, d.sellerId, d.dataSourceId, d.expectedVersion),
        audit(env, admin, d.code, "sales.profile.update", d),
      ]);
      return results[0].meta.changes
        ? json({ data: { saved: true } })
        : json({ error: { message: "Contul s-a modificat. Reîncarcă." } }, 409);
    }
    const parsed = z
      .object({
        code: channelSchema,
        expectedVersion: z.number().int().nonnegative(),
        action: z.enum(["save", "prepare", "confirm_manual"]),
        title: z.string().trim().min(2).max(200),
        description: z.string().trim().min(5).max(8000),
        listingUrl: z.string().max(500).default(""),
        catalogHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .safeParse(body);
    if (!parsed.success) return json({ error: { message: "Verifică anunțul." } }, 400);
    const d = parsed.data,
      entity = `${match![1]}:${d.code}`,
      snapshot = publicSnapshot(product!),
      catalogHash = await hash(snapshot);
    if (catalogHash !== d.catalogHash)
      return json(
        { error: { message: "Catalogul s-a schimbat. Reîncarcă prețul și disponibilitatea." } },
        409,
      );
    if (!validChannelUrl(d.code, d.listingUrl) || (d.action === "confirm_manual" && !d.listingUrl))
      return json(
        { error: { message: "Este necesar linkul anunțului de pe platforma aleasă." } },
        400,
      );
    const status =
      d.action === "prepare"
        ? "awaiting_publication"
        : d.action === "confirm_manual"
          ? "published_manual"
          : "draft";
    const token = crypto.randomUUID();
    const change = env.DB.prepare(
      `INSERT INTO product_channel_drafts(product_id,channel_code,title,description,listing_url,status,published_catalog_hash,published_at) SELECT ?1,?2,?3,?4,?5,?6,?7,?8 WHERE ?9=0 OR EXISTS(SELECT 1 FROM product_channel_drafts WHERE product_id=?1 AND channel_code=?2 AND version=?9) ON CONFLICT(product_id,channel_code) DO UPDATE SET title=excluded.title,description=excluded.description,listing_url=excluded.listing_url,status=excluded.status,published_catalog_hash=COALESCE(excluded.published_catalog_hash,product_channel_drafts.published_catalog_hash),published_at=COALESCE(excluded.published_at,product_channel_drafts.published_at),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE version=?9`,
    ).bind(
      match![1],
      d.code,
      d.title,
      d.description,
      d.listingUrl,
      status,
      d.action === "confirm_manual" ? catalogHash : null,
      d.action === "confirm_manual" ? new Date().toISOString() : null,
      d.expectedVersion,
    );
    const marker = env.DB.prepare(
      "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) SELECT ?1,?2,?3,?4,'product_channel',?5,?6,'{}' WHERE changes()=1",
    ).bind(token, admin.id, admin.email, `sales.${d.action}`, entity, JSON.stringify(d));
    const statements = [change, marker];
    if (d.action === "prepare")
      statements.push(
        env.DB.prepare(
          "INSERT OR IGNORE INTO channel_publication_requests(id,product_id,channel_code,draft_version,catalog_hash,snapshot_json,requested_by) SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?8)",
        ).bind(
          crypto.randomUUID(),
          match![1],
          d.code,
          d.expectedVersion + 1,
          catalogHash,
          JSON.stringify({ ...snapshot, title: d.title, description: d.description }),
          admin.id,
          token,
        ),
      );
    if (d.action === "confirm_manual")
      statements.push(
        env.DB.prepare(
          "UPDATE channel_publication_requests SET status='completed_manual',completed_by=?1,completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE product_id=?2 AND channel_code=?3 AND catalog_hash=?4 AND status='awaiting_publication' AND EXISTS(SELECT 1 FROM audit_log WHERE id=?5)",
        ).bind(admin.id, match![1], d.code, catalogHash, token),
      );
    if (d.action === "confirm_manual")
      statements.push(
        env.DB.prepare(
          `INSERT INTO channel_listings(id,channel_id,product_id,variant_id,listing_url,title_override,status,metadata_json)
        SELECT ?1,sc.id,pv.product_id,pv.id,?2,?3,'active','{"verification":"admin_manual"}' FROM sales_channels sc JOIN product_variants pv ON pv.id=(SELECT id FROM product_variants WHERE product_id=?4 AND status='active' ORDER BY sort_order,created_at LIMIT 1)
        WHERE sc.code=?5 AND EXISTS(SELECT 1 FROM audit_log WHERE id=?6)
        ON CONFLICT(channel_id,product_id,variant_id) DO UPDATE SET listing_url=excluded.listing_url,title_override=excluded.title_override,status='active',metadata_json=json_set(channel_listings.metadata_json,'$.verification','admin_manual'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
        ).bind(crypto.randomUUID(), d.listingUrl, d.title, match![1], d.code, token),
      );
    const result = await env.DB.batch(statements);
    return result[0].meta.changes
      ? json({
          data: {
            saved: true,
            status,
            portal: salesChannelDefinitions[d.code as SalesChannelCode].portal,
          },
        })
      : json({ error: { message: "Anunțul s-a schimbat. Reîncarcă." } }, 409);
  } catch (e) {
    return json(
      { error: { message: "Operația canalului nu a putut fi finalizată." } },
      e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : 500,
    );
  }
}
