import { z } from "zod";
import { awardMagicStarsForApprovedReview } from "@/server/services/magic-rewards";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { reviewInput, validReviewSource, type PublicReview } from "@/lib/reviews";
import { boundedJson } from "./bounded-json";
import {
  currentReviewer,
  reviewFailure,
  reviewJson,
  reviewRate,
  requestIP,
  sameOrigin,
} from "../review-accounts";
const sourceEnum = z.enum([
  "store",
  "facebook",
  "tiktok",
  "emag",
  "trendyol",
  "vinted",
  "olx",
  "okazii",
]);
const importInput = reviewInput
  .omit({ email: true, website: true, consent: true })
  .extend({
    displayName: z.string().trim().min(2).max(60),
    source: sourceEnum,
    sourceUrl: z.string().url().max(1000),
    authentic: z.literal(true),
  })
  .refine((v) => validReviewSource(v.source, v.sourceUrl), {
    message: "Leagă recenzia de adresa originală de pe platforma selectată.",
  });
const moderationInput = z.object({
  expectedVersion: z.number().int().positive(),
  status: z.enum(["pending", "approved", "rejected"]),
  featured: z.boolean(),
  note: z.string().trim().max(500).default(""),
});
const visible = "p.status='active' AND p.published_at IS NOT NULL AND p.product_type='music_box'";
const publicSelect =
  "r.id,p.slug AS productSlug,p.name AS productName,r.display_name AS displayName,r.rating,r.body,r.language,r.country_code AS countryCode,r.source,r.source_url AS sourceUrl,CASE WHEN r.photo_r2_key IS NOT NULL THEN '/api/v1/review-media/'||r.id ELSE NULL END AS photoUrl";

function imageExtension(bytes: Uint8Array, type: string): "jpg" | "png" | "webp" | null {
  if (type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpg";
  if (
    type === "image/png" &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  if (
    type === "image/webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
async function product(env: Env, slug: string) {
  const p = await env.DB.prepare(
    `SELECT p.id,p.name FROM products p WHERE p.slug=?1 AND ${visible}`,
  )
    .bind(slug)
    .first<{ id: string; name: string }>();
  if (!p) throw reviewFailure("Cutiuța nu este disponibilă.", 404);
  return p;
}
export async function listReviews(env: Env, slug: string | null, offset = 0, limit = 20) {
  if (slug) await product(env, slug);
  const where = `${visible} AND r.status='approved' AND (?1 IS NULL OR p.slug=?1)`;
  const [rows, summary] = await Promise.all([
    env.DB.prepare(
      `SELECT ${publicSelect} FROM product_reviews r JOIN products p ON p.id=r.product_id WHERE ${where} ORDER BY r.featured DESC,r.created_at DESC,r.id LIMIT ?3 OFFSET ?2`,
    )
      .bind(slug, offset, limit)
      .all<PublicReview>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total,AVG(r.rating) AS average FROM product_reviews r JOIN products p ON p.id=r.product_id WHERE ${where}`,
    )
      .bind(slug)
      .first<{ total: number; average: number | null }>(),
  ]);
  return {
    reviews: rows.results,
    total: summary?.total || 0,
    average: summary?.average || null,
    hasMore: (summary?.total || 0) > offset + limit,
  };
}
export async function handleReviews(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url),
    path = url.pathname,
    admin = path === "/api/v1/admin/reviews" || path.startsWith("/api/v1/admin/reviews/");
  const photoMatch = path.match(/^\/api\/v1\/reviews\/([a-f0-9-]{36})\/photo$/);
  const publicPhotoMatch = path.match(/^\/api\/v1\/review-media\/([a-f0-9-]{36})$/);
  if (!admin && path !== "/api/v1/reviews" && !photoMatch && !publicPhotoMatch) return null;
  try {
    if (publicPhotoMatch && request.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT photo_r2_key FROM product_reviews WHERE id=?1 AND status='approved' AND photo_r2_key IS NOT NULL",
      )
        .bind(publicPhotoMatch[1])
        .first<{ photo_r2_key: string }>();
      if (!row) return new Response("Not found", { status: 404 });
      const object = await env.MEDIA.get(row.photo_r2_key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
      headers.set("x-content-type-options", "nosniff");
      return new Response(object.body, { headers });
    }
    if (photoMatch && request.method === "POST") {
      sameOrigin(request);
      const account = await currentReviewer(request, env);
      if (!account) throw reviewFailure("Conectează-te cu Google pentru a adăuga fotografia.", 401);
      const review = await env.DB.prepare(
        `SELECT id FROM product_reviews
         WHERE id=?1 AND account_id=?2 AND status='pending' AND photo_r2_key IS NULL`,
      )
        .bind(photoMatch[1], account.id)
        .first<{ id: string }>();
      if (!review)
        throw reviewFailure("Fotografia nu mai poate fi adăugată acestei recenzii.", 409);
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > 5_500_000)
        throw reviewFailure("Fotografia poate avea maximum 5 MB.", 413);
      const form = await request.formData();
      const file = form.get("photo");
      if (!(file instanceof File) || file.size < 100 || file.size > 5_000_000)
        throw reviewFailure("Alege o fotografie JPG, PNG sau WebP de maximum 5 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = imageExtension(bytes, file.type);
      if (!extension) throw reviewFailure("Formatul fotografiei nu este acceptat.");
      const key = `reviews/${account.id}/${review.id}/${crypto.randomUUID()}.${extension}`;
      await env.MEDIA.put(key, bytes, {
        httpMetadata: { contentType: file.type },
        customMetadata: { reviewId: review.id, accountId: account.id },
      });
      const result = await env.DB.prepare(
        "UPDATE product_reviews SET photo_r2_key=?1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND account_id=?3 AND photo_r2_key IS NULL",
      )
        .bind(key, review.id, account.id)
        .run();
      if (!result.meta.changes) {
        await env.MEDIA.delete(key);
        throw reviewFailure("Fotografia a fost deja adăugată.", 409);
      }
      return reviewJson({ data: { uploaded: true } }, 201);
    }
    if (admin) {
      const identity = await authenticateAdminRequest(
        request,
        env,
        request.method === "GET" ? "catalog.read" : "catalog.write",
      );
      if (request.method === "GET" && path === "/api/v1/admin/reviews") {
        const status = z
          .enum(["pending", "approved", "rejected", "all"])
          .parse(url.searchParams.get("status") || "pending");
        const offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(100000)
          .parse(url.searchParams.get("offset") || 0);
        const productFilter = url.searchParams.get("product") || "";
        const rows = await env.DB.prepare(
          `SELECT ${publicSelect},r.email,r.origin,r.status,r.featured,r.version,r.moderation_note AS note,r.created_at AS createdAt FROM product_reviews r JOIN products p ON p.id=r.product_id WHERE (?1='all' OR r.status=?1) AND (?3='' OR p.slug=?3) ORDER BY r.created_at DESC,r.id LIMIT 51 OFFSET ?2`,
        )
          .bind(status, offset, productFilter)
          .all();
        const counts = await env.DB.prepare(
          "SELECT status,COUNT(*) AS count FROM product_reviews GROUP BY status",
        ).all();
        return reviewJson({
          data: {
            reviews: rows.results.slice(0, 50),
            hasMore: rows.results.length > 50,
            counts: counts.results,
          },
        });
      }
      sameOrigin(request);
      if (path === "/api/v1/admin/reviews/import" && request.method === "POST") {
        const parsed = importInput.safeParse(await boundedJson(request, 8192));
        if (!parsed.success)
          throw reviewFailure("Completează recenzia reală și un link valid către sursa originală.");
        const v = parsed.data,
          p = await product(env, v.productSlug),
          id = crypto.randomUUID();
        const result = await env.DB.batch([
          env.DB.prepare(
            "INSERT OR IGNORE INTO product_reviews(id,product_id,display_name,rating,body,language,country_code,source,source_url,origin) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'import')",
          ).bind(
            id,
            p.id,
            v.displayName,
            v.rating,
            v.body,
            v.language,
            v.countryCode || null,
            v.source,
            v.sourceUrl,
          ),
          env.DB.prepare(
            "INSERT INTO business_activity(id,actor_id,action,entity_id,created_at) SELECT ?1,?2,'review.imported',?3,strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE changes()=1",
          ).bind(crypto.randomUUID(), identity.id, id),
        ]);
        if (!result[0].meta.changes)
          throw reviewFailure("Această sursă a fost deja importată.", 409);
        return reviewJson({ data: { id, status: "pending" } }, 201);
      }
      const match = path.match(/^\/api\/v1\/admin\/reviews\/([a-f0-9-]{36})$/);
      if (request.method === "PATCH" && match) {
        const parsed = moderationInput.safeParse(await boundedJson(request, 4096));
        if (!parsed.success) throw reviewFailure("Date de moderare invalide.");
        const v = parsed.data;
        const result = await env.DB.batch([
          env.DB.prepare(
            "UPDATE product_reviews SET status=?1,featured=?2,moderation_note=?3,moderated_by=?4,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?5 AND version=?6",
          ).bind(v.status, Number(v.featured), v.note, identity.id, match[1], v.expectedVersion),
          env.DB.prepare(
            "INSERT INTO audit_log(id,actor_admin_user_id,action,entity_type,entity_id,after_json,metadata_json) SELECT ?1,?2,'review.moderated','product_review',?3,?4,'{}' WHERE changes()=1",
          ).bind(
            crypto.randomUUID(),
            identity.id,
            match[1],
            JSON.stringify({ status: v.status, featured: v.featured }),
          ),
        ]);
        if (!result[0].meta.changes)
          throw reviewFailure("Recenzia s-a schimbat. Reîncarcă lista.", 409);
        if (v.status === "approved") await awardMagicStarsForApprovedReview(env.DB, match[1]);
        return reviewJson({ data: { saved: true } });
      }
      throw reviewFailure("Metodă nepermisă.", 405);
    }
    if (request.method === "GET") {
      const slug = url.searchParams.get("product"),
        offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(100000)
          .parse(url.searchParams.get("offset") || 0),
        limit = z.coerce
          .number()
          .int()
          .min(1)
          .max(20)
          .parse(url.searchParams.get("limit") || 20);
      if (slug && !/^[a-z0-9-]{1,128}$/.test(slug)) throw reviewFailure("Produs invalid.");
      return reviewJson({ data: await listReviews(env, slug, offset, limit) });
    }
    if (request.method !== "POST") throw reviewFailure("Metodă nepermisă.", 405);
    sameOrigin(request);
    const parsed = reviewInput.safeParse(await boundedJson(request, 8192));
    if (!parsed.success)
      throw reviewFailure(
        "Completează numele, e-mailul, evaluarea și un text de 10–1200 de caractere.",
      );
    const v = parsed.data,
      account = await currentReviewer(request, env),
      email = account?.email || v.email,
      name = account?.displayName || v.displayName;
    if (!email || !name) throw reviewFailure("Completează numele și e-mailul.");
    await reviewRate(env, ["review-ip:" + requestIP(request), "review-email:" + email], 6);
    const p = await product(env, v.productSlug),
      id = crypto.randomUUID();
    const result = await env.DB.prepare(
      "INSERT OR IGNORE INTO product_reviews(id,product_id,account_id,display_name,email,rating,body,language,country_code,origin) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
    )
      .bind(
        id,
        p.id,
        account?.id || null,
        name,
        email,
        v.rating,
        v.body,
        v.language,
        v.countryCode || null,
        account ? "account" : "guest",
      )
      .run();
    if (!result.meta.changes)
      throw reviewFailure("Ai trimis deja o recenzie pentru această cutiuță.", 409);
    return reviewJson(
      {
        data: { id, status: "pending", message: "Mulțumim! Părerea ta va apărea după verificare." },
      },
      201,
    );
  } catch (error) {
    const status =
      error instanceof z.ZodError
        ? 400
        : error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 500;
    return reviewJson(
      {
        error: {
          message:
            status === 500
              ? "Recenziile nu pot fi încărcate acum. Reîncearcă."
              : error instanceof z.ZodError
                ? "Date invalide."
                : (error as Error).message,
        },
      },
      status,
    );
  }
}
