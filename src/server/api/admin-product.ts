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
  variant: z
    .object({
      id: z.string().min(1).max(128),
      expectedVersion: z.number().int().positive(),
      eanGtin: z.union([z.literal(""), z.string().regex(/^\d{8,14}$/)]),
      mpn: z.string().trim().max(120),
      cost: z.number().min(0).max(1_000_000).nullable(),
      identifierSource: z.enum(["gs1", "manufacturer", "supplier", "marketplace", "internal"]),
    })
    .superRefine((variant, context) => {
      if (
        variant.eanGtin &&
        !["gs1", "manufacturer", "supplier"].includes(variant.identifierSource)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["identifierSource"],
          message: "Un GTIN/EAN public trebuie să provină de la GS1, producător sau furnizor.",
        });
      }
    })
    .optional(),
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
    const productUpdate = env.DB.prepare(
      `
      UPDATE products
      SET name = ?1, tagline = ?2, short_description = ?3, description = ?4,
          story = ?5, category = ?6, material = ?7, dimensions_text = ?8,
          weight_g = ?9, rights_status = ?10, rights_notes = ?11,
          seo_title = ?12, seo_description = ?13, search_terms = ?14,
          version = version + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?15 AND product_type = 'music_box' AND version = ?16
        AND (?17 IS NULL OR EXISTS (
          SELECT 1 FROM product_variants pv WHERE pv.id = ?17 AND pv.product_id = products.id
          AND pv.version = ?18 AND pv.status != 'archived'
        ))
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
      data.variant?.id ?? null,
      data.variant?.expectedVersion ?? null,
    );
    const writeStatements: D1PreparedStatement[] = [productUpdate];
    if (data.variant) {
      writeStatements.push(
        env.DB.prepare(
          `UPDATE product_variants
           SET ean_gtin = ?1, mpn = ?2, cost_bani = ?3, version = version + 1,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?4 AND product_id = ?5 AND version = ?6
             AND EXISTS (SELECT 1 FROM products WHERE id = ?5 AND version = ?7)`,
        ).bind(
          data.variant.eanGtin || null,
          data.variant.mpn || null,
          data.variant.cost == null ? null : Math.round(data.variant.cost * 100),
          data.variant.id,
          match[1],
          data.variant.expectedVersion,
          data.expectedVersion + 1,
        ),
      );
    }
    const writeResults = await env.DB.batch(writeStatements);
    if (
      Number(writeResults[0].meta.changes) !== 1 ||
      (data.variant && Number(writeResults[1]?.meta.changes) !== 1)
    ) {
      return json({ error: { code: "VERSION_CONFLICT" } }, { status: 409 });
    }
    if (data.variant) {
      const identifierStatements: D1PreparedStatement[] = [
        env.DB.prepare(
          `DELETE FROM product_identifier_sources
           WHERE variant_id = ?1 AND identifier_type IN ('GTIN', 'EAN')`,
        ).bind(data.variant.id),
      ];
      if (data.variant.eanGtin) {
        identifierStatements.push(
          env.DB.prepare(
            `INSERT INTO product_identifier_sources (
               id, variant_id, identifier_type, identifier_value, source_type,
               verification_status, verified_at
             ) VALUES (?1, ?2, 'EAN', ?3, ?4, ?5, ?6)`,
          ).bind(
            crypto.randomUUID(),
            data.variant.id,
            data.variant.eanGtin,
            data.variant.identifierSource,
            data.variant.identifierSource === "internal" ? "rejected" : "pending",
            null,
          ),
        );
      }
      await env.DB.batch(identifierStatements);
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
