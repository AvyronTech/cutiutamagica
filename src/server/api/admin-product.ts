import { productDiscoverySchema } from "@/lib/product-discovery";
import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";

const updateProductSchema = z.object({
  discovery: productDiscoverySchema.optional(),
  expectedVersion: z.number().int().positive(),
  shortName: z.string().trim().max(90).optional(),
  collection: z.enum(["story", "emotion", "dedicated"]).optional(),
  landingOrder: z.number().int().min(0).max(10000).optional(),
  storefrontState: z.enum(["available", "coming_soon", "out_of_stock"]).optional(),
  featured: z.boolean().optional(),
  preorderEnabled: z.boolean().optional(),
  releaseNote: z.string().trim().max(240).optional(),
  details: z.array(z.string().trim().max(500)).max(30).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  name: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(240),
  shortDescription: z.string().trim().max(500),
  description: z.string().trim().max(5000),
  story: z.string().trim().max(5000),
  category: z.string().trim().min(2).max(120),
  material: z.string().trim().max(120),
  dimensionsText: z.string().trim().max(160),
  weightG: z.number().int().positive().max(100_000).nullable(),
  rightsStatus: z.enum(["review_required", "cleared", "restricted", "expired"]),
  rightsNotes: z.string().trim().max(1000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(180),
  searchTerms: z.string().trim().max(1200),
});

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function handleAdminProductApi(request: Request, env: Env): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)$/,
  );
  if (!match) return null;
  if (request.method !== "PATCH") {
    return json(
      { error: { code: "METHOD_NOT_ALLOWED" } },
      { status: 405, headers: { allow: "PATCH" } },
    );
  }

  try {
    const admin = await authenticateAdminRequest(request, env, "catalog.write");
    if (!sameOrigin(request))
      return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (body && typeof body === "object" && "variant" in body)
      return json(
        {
          error: {
            code: "TECHNICAL_SHEET_REQUIRED",
            message: "EAN-ul, sursa și costul se editează în fișa tehnică a produsului.",
          },
        },
        { status: 400 },
      );
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        { error: { code: "INVALID_PRODUCT", issues: parsed.error.flatten() } },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const productUpdate = env.DB.prepare(
      `
      UPDATE products
      SET discovery_json=COALESCE(?26,discovery_json), short_name=COALESCE(?17,short_name), landing_collection=COALESCE(?18,landing_collection),
          landing_order=COALESCE(?19,landing_order), storefront_state=COALESCE(?20,storefront_state),
          is_featured=COALESCE(?21,is_featured), preorder_enabled=COALESCE(?22,preorder_enabled),
          release_note=COALESCE(?23,release_note), details_json=COALESCE(?24,details_json),
          status=COALESCE(?25,status), published_at=CASE WHEN ?25='active' THEN COALESCE(published_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) ELSE published_at END,
          name = ?1, tagline = ?2, short_description = ?3, description = ?4,
          story = ?5, category = ?6, material = ?7, dimensions_text = ?8,
          weight_g = ?9, rights_status = ?10, rights_notes = ?11,
          seo_title = ?12, seo_description = ?13, search_terms = ?14,
          version = version + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?15 AND product_type = 'music_box' AND version = ?16
    `,
    ).bind(
      data.name,
      data.tagline || null,
      data.shortDescription || null,
      data.description || null,
      data.story || null,
      data.category,
      data.material || null,
      data.dimensionsText || null,
      data.weightG,
      data.rightsStatus,
      data.rightsNotes || null,
      data.seoTitle || null,
      data.seoDescription || null,
      data.searchTerms || null,
      match[1],
      data.expectedVersion,
      data.shortName ?? null,
      data.collection ?? null,
      data.landingOrder ?? null,
      data.storefrontState ?? null,
      data.featured === undefined ? null : Number(data.featured),
      data.preorderEnabled === undefined ? null : Number(data.preorderEnabled),
      data.releaseNote ?? null,
      data.details ? JSON.stringify(data.details) : null,
      data.status ?? null,
      data.discovery ? JSON.stringify(data.discovery) : null,
    );
    const writeStatements: D1PreparedStatement[] = [productUpdate];
    if (data.storefrontState)
      writeStatements.push(
        env.DB.prepare(
          `UPDATE channel_listings SET status=?1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE product_id=?2 AND channel_id='channel_website' AND changes()=1 AND EXISTS (SELECT 1 FROM products WHERE id=?2 AND version=?3)`,
        ).bind(
          data.storefrontState === "available" ? "active" : "paused",
          match[1],
          data.expectedVersion + 1,
        ),
      );
    const writeResults = await env.DB.batch(writeStatements);
    if (Number(writeResults[0].meta.changes) !== 1) {
      return json({ error: { code: "VERSION_CONFLICT" } }, { status: 409 });
    }
    await env.DB.prepare(
      `
      INSERT INTO audit_log (
        id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
        after_json, metadata_json
      ) VALUES (?1, ?2, ?3, 'product.update', 'product', ?4, ?5, '{}')
    `,
    )
      .bind(
        crypto.randomUUID(),
        admin.id,
        admin.email,
        match[1],
        JSON.stringify({ ...data, expectedVersion: undefined }),
      )
      .run();
    await env.CACHE.delete("catalog:public:v1");
    return json({ data: { id: match[1], version: data.expectedVersion + 1 } });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode) || 500
        : 500;
    console.error("admin.product.failed", error);
    return json(
      {
        error: {
          code:
            status === 401
              ? "UNAUTHORIZED"
              : status === 403
                ? "FORBIDDEN"
                : "PRODUCT_UPDATE_FAILED",
          message: status >= 500 ? "Produsul nu a putut fi salvat." : (error as Error).message,
        },
      },
      { status },
    );
  }
}
