import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { gtinType } from "@/lib/product-identification";

const updateSchema = z.object({
  variantId: z.string().min(1).max(128),
  expectedVersion: z.number().int().positive(),
  eanGtin: z
    .string()
    .trim()
    .max(14)
    .refine(
      (value) => !value || Boolean(gtinType(value)),
      "Codul GTIN/EAN are lungimea sau cifra de control greșită.",
    ),
  mpn: z.string().trim().max(120),
  cost: z.number().finite().min(0).max(1_000_000).nullable(),
  identifierSource: z.enum(["gs1", "manufacturer", "supplier"]),
  sourceReference: z.string().trim().max(240),
  documentId: z.string().trim().min(1).max(128).nullable().optional(),
  verifyGtin: z.boolean().optional(),
  changeReason: z.string().trim().max(500).default(""),
});

type VariantRow = {
  id: string;
  sku: string;
  ean_gtin: string | null;
  mpn: string | null;
  cost_bani: number | null;
  version: number;
};
type SourceRow = {
  source_type: string;
  source_reference: string | null;
  verification_status: string;
  verified_at: string | null;
  gtin_type: string | null;
  assigned_at: string | null;
  document_id: string | null;
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export async function handleProductTechnicalSheet(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/technical-sheet$/,
  );
  if (!match) return null;
  if (!["GET", "PATCH"].includes(request.method))
    return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
  const productId = match[1];
  try {
    const admin = await authenticateAdminRequest(
      request,
      env,
      request.method === "PATCH" ? "catalog.write" : "catalog.read",
    );
    if (request.method === "GET") {
      const [variant, source, levels, sales, invoices, documents] = await Promise.all([
        env.DB.prepare(
          `SELECT pv.id,pv.sku,pv.ean_gtin,pv.mpn,pv.cost_bani,pv.version
          FROM product_variants pv JOIN products p ON p.id=pv.product_id
          WHERE p.id=?1 AND p.product_type='music_box' AND pv.status!='archived'
          ORDER BY pv.sort_order LIMIT 1`,
        )
          .bind(productId)
          .first<VariantRow>(),
        env.DB.prepare(
          `SELECT pis.source_type,pis.source_reference,pis.verification_status,pis.verified_at,
                  pis.gtin_type,pis.assigned_at,pis.document_id
          FROM product_identifier_sources pis
          WHERE pis.variant_id=(SELECT id FROM product_variants
            WHERE product_id=?1 AND status!='archived' ORDER BY sort_order LIMIT 1)
            AND pis.identifier_type IN ('EAN','GTIN')
          ORDER BY pis.created_at DESC LIMIT 1`,
        )
          .bind(productId)
          .first<SourceRow>(),
        env.DB.prepare(
          `SELECT sl.name,il.on_hand_quantity,il.reserved_quantity,il.safety_stock_quantity
          FROM inventory_levels il JOIN stock_locations sl ON sl.id=il.location_id
          WHERE il.variant_id=(SELECT id FROM product_variants
            WHERE product_id=?1 AND status!='archived' ORDER BY sort_order LIMIT 1)
          ORDER BY sl.name`,
        )
          .bind(productId)
          .all(),
        admin.permissions.includes("orders.read")
          ? env.DB.prepare(
              `SELECT COUNT(DISTINCT o.id) AS orders_count,
              COALESCE(SUM(oi.quantity),0) AS units_sold,
              COALESCE(SUM(oi.line_total_bani),0) AS sales_bani
            FROM order_items oi JOIN orders o ON o.id=oi.order_id
            WHERE oi.product_id=?1 AND o.order_status NOT IN ('draft','cancelled')`,
            )
              .bind(productId)
              .first()
          : Promise.resolve(null),
        admin.permissions.includes("orders.read")
          ? env.DB.prepare(
              `SELECT COUNT(DISTINCT i.id) AS invoice_count
            FROM invoices i JOIN order_items oi ON oi.order_id=i.order_id
            WHERE oi.product_id=?1 AND i.invoice_type='invoice' AND i.status IN ('issued','paid')`,
            )
              .bind(productId)
              .first()
          : Promise.resolve(null),
        env.DB.prepare(
          `SELECT id,document_type,document_number,review_status FROM product_documents
           WHERE product_id=?1 ORDER BY created_at DESC LIMIT 30`,
        )
          .bind(productId)
          .all(),
      ]);
      if (!variant)
        return json(
          { error: { code: "PRODUCT_NOT_FOUND", message: "Produsul nu are o variantă activă." } },
          404,
        );
      return json({
        data: {
          variant,
          source,
          levels: levels.results,
          sales,
          invoices,
          documents: documents.results,
        },
      });
    }

    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, 403);
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return json(
        {
          error: {
            code: "INVALID_TECHNICAL_SHEET",
            message: parsed.error.issues[0]?.message || "Verifică datele tehnice.",
          },
        },
        400,
      );
    const data = parsed.data;
    if (data.verifyGtin && (!data.eanGtin || !data.sourceReference))
      return json(
        {
          error: {
            code: "EVIDENCE_REQUIRED",
            message: "Pentru verificare, completează codul și referința sursei.",
          },
        },
        400,
      );
    if (data.documentId) {
      const evidence = await env.DB.prepare(
        "SELECT id FROM product_documents WHERE id=?1 AND product_id=?2 AND review_status='verified'",
      )
        .bind(data.documentId, productId)
        .first();
      if (!evidence)
        return json(
          {
            error: {
              code: "INVALID_DOCUMENT",
              message: "Alege un document verificat al acestui produs.",
            },
          },
          400,
        );
    }
    if (data.eanGtin) {
      const duplicate = await env.DB.prepare(
        `SELECT variant_id FROM product_gtin_registry WHERE gtin=?1 AND variant_id!=?2 LIMIT 1`,
      )
        .bind(data.eanGtin, data.variantId)
        .first();
      if (duplicate)
        return json(
          {
            error: {
              code: "EAN_ALREADY_ASSIGNED",
              message: "Acest EAN este deja atribuit altui produs.",
            },
          },
          409,
        );
    }
    const current = await env.DB.prepare(
      `SELECT pv.id,pv.sku,pv.ean_gtin,pv.mpn,pv.cost_bani,pv.version
      FROM product_variants pv JOIN products p ON p.id=pv.product_id
      WHERE p.id=?1 AND p.product_type='music_box' AND pv.id=?2 AND pv.status!='archived'`,
    )
      .bind(productId, data.variantId)
      .first<VariantRow>();
    if (!current) return json({ error: { code: "PRODUCT_NOT_FOUND" } }, 404);
    if (current.version !== data.expectedVersion)
      return json(
        {
          error: {
            code: "VERSION_CONFLICT",
            message: "Fișa a fost schimbată între timp. Reîncarcă pagina.",
          },
        },
        409,
      );
    if (
      ((current.ean_gtin && current.ean_gtin !== (data.eanGtin || null)) ||
        (current.mpn && current.mpn !== (data.mpn || null))) &&
      data.changeReason.length < 10
    )
      return json(
        {
          error: {
            code: "REASON_REQUIRED",
            message: "Retragerea sau schimbarea unui cod cere un motiv de cel puțin 10 caractere.",
          },
        },
        400,
      );
    const source = await env.DB.prepare(
      `SELECT source_type,source_reference,verification_status,verified_at,gtin_type,assigned_at,document_id
      FROM product_identifier_sources WHERE variant_id=?1 AND identifier_type IN ('EAN','GTIN')
      ORDER BY created_at DESC LIMIT 1`,
    )
      .bind(data.variantId)
      .first<SourceRow>();
    const nextEan = data.eanGtin || null;
    const sourceChanged =
      current.ean_gtin !== nextEan ||
      (nextEan !== null &&
        (source?.source_type !== data.identifierSource ||
          (source?.source_reference ?? "") !== data.sourceReference ||
          (source?.document_id ?? null) !== (data.documentId ?? null)));
    const nextStatus = nextEan
      ? data.verifyGtin
        ? "verified"
        : sourceChanged
          ? "pending"
          : (source?.verification_status ?? "pending")
      : null;
    const auditId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(
        `UPDATE product_variants SET ean_gtin=?1,mpn=?2,cost_bani=?3,
        version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=?4 AND product_id=?5 AND version=?6`,
      ).bind(
        nextEan,
        data.mpn || null,
        data.cost === null ? null : Math.round(data.cost * 100),
        data.variantId,
        productId,
        data.expectedVersion,
      ),
      env.DB.prepare(
        `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,before_json,after_json,metadata_json)
        SELECT ?1,?2,?3,'product.identifier.update','product_variant',?4,?5,?6,?7 WHERE changes()=1`,
      ).bind(
        auditId,
        admin.id,
        admin.email,
        data.variantId,
        JSON.stringify({
          eanGtin: current.ean_gtin,
          mpn: current.mpn,
          costBani: current.cost_bani,
        }),
        JSON.stringify({
          eanGtin: nextEan,
          mpn: data.mpn,
          costBani: data.cost === null ? null : Math.round(data.cost * 100),
          identifierSource: nextEan ? data.identifierSource : null,
          sourceReference: nextEan ? data.sourceReference : null,
        }),
        JSON.stringify({ reason: data.changeReason || null }),
      ),
    ];
    if (sourceChanged) {
      statements.push(
        env.DB.prepare(
          `DELETE FROM product_identifier_sources
        WHERE variant_id=?1 AND identifier_type IN ('EAN','GTIN')
        AND EXISTS (SELECT 1 FROM audit_log WHERE id=?2)`,
        ).bind(data.variantId, auditId),
      );
      if (nextEan)
        statements.push(
          env.DB.prepare(
            `INSERT INTO product_identifier_sources
        (id,variant_id,identifier_type,identifier_value,source_type,source_reference,verification_status,
         gtin_type,assigned_at,document_id,verified_at)
        SELECT ?1,?2,'GTIN',?3,?4,?5,?6,?7,strftime('%Y-%m-%dT%H:%M:%fZ','now'),?8,
               CASE WHEN ?6='verified' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') END
        WHERE EXISTS (SELECT 1 FROM audit_log WHERE id=?9)`,
          ).bind(
            crypto.randomUUID(),
            data.variantId,
            nextEan,
            data.identifierSource,
            data.sourceReference || null,
            nextStatus,
            gtinType(nextEan),
            data.documentId ?? null,
            auditId,
          ),
        );
    } else if (nextEan && data.verifyGtin && source?.verification_status !== "verified") {
      statements.push(
        env.DB.prepare(
          `UPDATE product_identifier_sources SET verification_status='verified',verified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE variant_id=?1 AND identifier_type IN ('EAN','GTIN') AND identifier_value=?2 AND EXISTS(SELECT 1 FROM audit_log WHERE id=?3)`,
        ).bind(data.variantId, nextEan, auditId),
      );
    }
    if (
      current.ean_gtin !== nextEan ||
      (nextEan && data.verifyGtin && source?.verification_status !== "verified")
    )
      statements.push(
        env.DB.prepare(
          `INSERT INTO product_identifier_history(id,variant_id,action,old_value,new_value,metadata_json,actor_admin_user_id)
         SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?8)`,
        ).bind(
          crypto.randomUUID(),
          data.variantId,
          current.ean_gtin === nextEan
            ? "gtin_verified"
            : !nextEan
              ? "gtin_cleared"
              : current.ean_gtin
                ? "gtin_changed"
                : "gtin_assigned",
          current.ean_gtin,
          nextEan,
          JSON.stringify({
            source: data.identifierSource,
            sourceReference: data.sourceReference,
            documentId: data.documentId ?? null,
            status: nextStatus,
            reason: data.changeReason || null,
          }),
          admin.id,
          auditId,
        ),
      );
    const result = await env.DB.batch(statements);
    if (Number(result[0].meta.changes) !== 1)
      return json(
        {
          error: {
            code: "VERSION_CONFLICT",
            message: "Fișa a fost schimbată între timp. Reîncarcă pagina.",
          },
        },
        409,
      );
    await env.CACHE.delete("catalog:public:v1");
    return json({
      data: {
        variantId: data.variantId,
        version: data.expectedVersion + 1,
        verificationStatus: nextStatus,
      },
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode) || 500
        : 500;
    const message = error instanceof Error ? error.message : "Fișa nu a putut fi salvată.";
    if (status === 500) console.error("admin.technical_sheet.failed", error);
    return json(
      {
        error: {
          code:
            status === 401
              ? "UNAUTHORIZED"
              : status === 403
                ? "FORBIDDEN"
                : "TECHNICAL_SHEET_FAILED",
          message:
            status >= 500
              ? "Fișa nu a putut fi salvată. Verifică dacă EAN-ul este deja folosit."
              : message,
        },
      },
      status,
    );
  }
}
