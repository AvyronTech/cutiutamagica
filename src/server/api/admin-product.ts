import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";

const updateProductSchema = z.object({
  expectedVersion: z.number().int().positive(),
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
    const parsed = updateProductSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return json(
        { error: { code: "INVALID_PRODUCT", issues: parsed.error.flatten() } },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const result = await env.DB.prepare(
      `
      UPDATE products
      SET name = ?1, tagline = ?2, short_description = ?3, description = ?4,
          story = ?5, category = ?6, material = ?7, dimensions_text = ?8,
          weight_g = ?9, rights_status = ?10, rights_notes = ?11,
          seo_title = ?12, seo_description = ?13, search_terms = ?14,
          version = version + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?15 AND product_type = 'music_box' AND version = ?16
    `,
    )
      .bind(
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
      )
      .run();
    if (Number(result.meta.changes) !== 1) {
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
