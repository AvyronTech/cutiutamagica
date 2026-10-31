import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";

const boxModelSchema = z.enum(["classic", "panorama", "keepsake"]);
const procurementStatusSchema = z.enum([
  "awaiting_source",
  "ready_to_order",
  "ordered",
  "received",
  "cancelled",
]);

function assertSameOrigin() {
  const request = getRequest();
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Cerere de administrare nepermisă.");
}

function verifiedTemuUrl(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (host !== "temu.com" && !host.endsWith(".temu.com")))
    throw new Error("Folosește un link HTTPS valid de pe temu.com.");
  url.hash = "";
  return url.toString();
}

export type PersonalizationProcurementRequest = {
  id: string;
  internalCode: string | null;
  internalStatus:
    "received" | "contacted" | "approved" | "in_production" | "shipped" | "cancelled" | null;
  customerName: string;
  email: string;
  phone: string;
  boxModel: "classic" | "panorama" | "keepsake";
  boxColor: "black" | "yellow";
  melody: "melody-1" | "melody-2" | "melody-3";
  engraving: string;
  giftWrap: boolean;
  totalBani: number;
  requestStatus: string;
  procurementStatus: z.infer<typeof procurementStatusSchema>;
  createdAt: string;
};

export type PersonalizationSource = {
  id: string;
  boxModel: "classic" | "panorama" | "keepsake";
  sourceUrl: string;
  listingTitle: string;
  variantLabel: string;
  priceText: string;
  status: "draft" | "verified" | "inactive";
  lastVerifiedAt: string | null;
};

export const getPersonalizationSources = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "orders.read");
    const sources = await env.DB.prepare(
      `SELECT id,box_model_id AS boxModel,source_url AS sourceUrl,
        listing_title AS listingTitle,variant_label AS variantLabel,price_text AS priceText,
        status,last_verified_at AS lastVerifiedAt
       FROM personalization_supplier_sources ORDER BY updated_at DESC LIMIT 100`,
    ).all<PersonalizationSource>();
    return { sources: sources.results };
  });

export type PersonalizationProcurementQueueItem = {
  id: string;
  internalCode: string | null;
  boxModel: PersonalizationProcurementRequest["boxModel"];
  procurementStatus: PersonalizationProcurementRequest["procurementStatus"];
  sourceUrl: string | null;
  listingTitle: string | null;
  variantLabel: string | null;
  priceText: string | null;
};

export const getPersonalizationProcurementQueue = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "orders.read");
    const requests = await env.DB.prepare(
      `SELECT pr.id,pi.code AS internalCode,pr.box_model AS boxModel,
         pr.procurement_status AS procurementStatus,ps.source_url AS sourceUrl,
         ps.listing_title AS listingTitle,ps.variant_label AS variantLabel,
         ps.price_text AS priceText
       FROM personalization_requests pr
       LEFT JOIN personalization_identifiers pi ON pi.request_id=pr.id
       LEFT JOIN personalization_supplier_sources ps ON ps.id=pr.supplier_source_id
       ORDER BY CASE pr.procurement_status
         WHEN 'ready_to_order' THEN 0 WHEN 'awaiting_source' THEN 1
         WHEN 'ordered' THEN 2 WHEN 'received' THEN 3 ELSE 4 END,
         pr.created_at DESC LIMIT 200`,
    ).all<PersonalizationProcurementQueueItem>();
    return { requests: requests.results };
  });

export const getPersonalizationProcurement = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "orders.read");
    const requests = await env.DB.prepare(
      `SELECT pr.id,pi.code AS internalCode,pr.status AS internalStatus,
          pr.customer_name AS customerName,pr.email,pr.phone,
          pr.box_model AS boxModel,pr.box_color AS boxColor,pr.melody,pr.engraving,
          pr.gift_wrap AS giftWrap,pr.total_bani AS totalBani,pr.status AS requestStatus,
          pr.procurement_status AS procurementStatus,pr.created_at AS createdAt
         FROM personalization_requests pr
         LEFT JOIN personalization_identifiers pi ON pi.request_id=pr.id
         ORDER BY CASE pr.procurement_status
           WHEN 'ready_to_order' THEN 0 WHEN 'awaiting_source' THEN 1
           WHEN 'ordered' THEN 2 WHEN 'received' THEN 3 ELSE 4 END,
           pr.created_at DESC LIMIT 200`,
    ).all<PersonalizationProcurementRequest>();
    return {
      requests: requests.results.map((item) => ({
        ...item,
        giftWrap: Number(item.giftWrap) === 1,
      })),
    };
  });

export const savePersonalizationTemuSource = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      boxModel: boxModelSchema,
      sourceUrl: z.string().trim().min(12).max(2000),
      listingTitle: z.string().trim().min(2).max(300),
      variantLabel: z.string().trim().max(240).default(""),
      priceText: z.string().trim().max(80).default(""),
      externalListingId: z.string().trim().max(180).default(""),
    }),
  )
  .handler(async ({ context, data }) => {
    assertSameOrigin();
    assertPermission(context.admin, "orders.write");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sourceUrl = verifiedTemuUrl(data.sourceUrl);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE personalization_supplier_sources
         SET status='inactive',updated_at=?2
         WHERE box_model_id=?1 AND status='verified'`,
      ).bind(data.boxModel, now),
      env.DB.prepare(
        `INSERT INTO personalization_supplier_sources(
          id,box_model_id,source_url,external_listing_id,listing_title,variant_label,
          price_text,status,last_verified_at,created_by_admin_id,created_at,updated_at
        ) VALUES(?1,?2,?3,?4,?5,?6,?7,'verified',?8,?9,?8,?8)`,
      ).bind(
        id,
        data.boxModel,
        sourceUrl,
        data.externalListingId || null,
        data.listingTitle,
        data.variantLabel,
        data.priceText,
        now,
        context.admin.id,
      ),
      env.DB.prepare(
        `UPDATE personalization_requests
         SET supplier_source_id=?1,procurement_status='ready_to_order',updated_at=?3
         WHERE box_model=?2 AND procurement_status='awaiting_source'`,
      ).bind(id, data.boxModel, now),
      env.DB.prepare(
        `INSERT INTO audit_log(
          id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json
        ) VALUES(?1,?2,?3,'personalization.source.verify','supplier_source',?4,?5,'{}')`,
      ).bind(
        crypto.randomUUID(),
        context.admin.id,
        context.admin.email,
        id,
        JSON.stringify({ boxModel: data.boxModel, sourceUrl, listingTitle: data.listingTitle }),
      ),
    ]);
    return { ok: true, id };
  });

export const updatePersonalizationProcurement = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      requestId: z.string().uuid(),
      status: z.enum(["ordered", "received", "cancelled"]),
    }),
  )
  .handler(async ({ context, data }) => {
    assertSameOrigin();
    assertPermission(context.admin, "orders.write");
    const request = await env.DB.prepare(
      `SELECT id,supplier_source_id AS sourceId,procurement_status AS status
       FROM personalization_requests WHERE id=?1`,
    )
      .bind(data.requestId)
      .first<{ id: string; sourceId: string | null; status: string }>();
    if (!request) throw new Error("Cererea nu mai există.");
    const allowedTransitions: Record<string, string[]> = {
      awaiting_source: ["cancelled"],
      ready_to_order: ["ordered", "cancelled"],
      ordered: ["received", "cancelled"],
    };
    if (!allowedTransitions[request.status]?.includes(data.status))
      throw new Error("Aprovizionarea nu poate trece direct în această stare. Reîncarcă cererea.");
    if (data.status === "ordered" && !request.sourceId)
      throw new Error("Leagă mai întâi o sursă Temu verificată.");
    const now = new Date().toISOString();
    const result = await env.DB.batch([
      env.DB.prepare(
        `UPDATE personalization_requests
         SET procurement_status=?2,
           ordered_at=CASE WHEN ?2='ordered' THEN ?3 ELSE ordered_at END,
           updated_at=?3 WHERE id=?1 AND procurement_status=?4`,
      ).bind(data.requestId, data.status, now, request.status),
      env.DB.prepare(
        `INSERT INTO audit_log(
          id,actor_admin_user_id,actor_label,action,entity_type,entity_id,
          before_json,after_json,metadata_json
        ) SELECT ?1,?2,?3,'personalization.procurement.update','personalization_request',
          ?4,?5,?6,'{}' WHERE changes()=1`,
      ).bind(
        crypto.randomUUID(),
        context.admin.id,
        context.admin.email,
        data.requestId,
        JSON.stringify({ status: request.status }),
        JSON.stringify({ status: data.status }),
      ),
    ]);
    if (!result[0].meta.changes)
      throw new Error("Cererea s-a modificat între timp. Reîncarcă lista.");
    return { ok: true };
  });
