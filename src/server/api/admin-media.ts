import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";

const SLOT_CODES = [
  "01_hero",
  "02_decor",
  "03_closed",
  "04_dimensions",
  "05_mechanism",
  "06_melody",
] as const;
const MEDIA_TYPES = ["image", "audio", "video", "spin_360", "model_3d", "document"] as const;
const USAGE_TYPES = [
  "product",
  "social",
  "story",
  "advertising",
  "hero",
  "detail",
  "360",
  "audio",
  "animation",
] as const;

const uploadMetadataSchema = z.object({
  mediaType: z.enum(MEDIA_TYPES),
  usageType: z.enum(USAGE_TYPES),
  slotCode: z.enum(SLOT_CODES).nullable().optional(),
  title: z.string().trim().max(120).default(""),
  promoTextRo: z.string().trim().max(90).default(""),
  altText: z.string().trim().max(240).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  syncToAvyron: z.boolean().default(false),
});

const updateMetadataSchema = z.object({
  title: z.string().trim().max(120).optional(),
  promoTextRo: z.string().trim().max(90).optional(),
  altText: z.string().trim().max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  marketingApproved: z.boolean().optional(),
  publicAccess: z.boolean().optional(),
  syncToAvyron: z.boolean().optional(),
  rightsStatus: z.enum(["review_required", "cleared", "restricted", "expired"]).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  expectedVersion: z.number().int().positive(),
});

const MIME_RULES = {
  "image/jpeg": { extension: "jpg", mediaType: "image", max: 15_000_000 },
  "image/png": { extension: "png", mediaType: "image", max: 15_000_000 },
  "image/webp": { extension: "webp", mediaType: "image", max: 15_000_000 },
  "image/avif": { extension: "avif", mediaType: "image", max: 15_000_000 },
  "audio/mpeg": { extension: "mp3", mediaType: "audio", max: 20_000_000 },
  "audio/wav": { extension: "wav", mediaType: "audio", max: 30_000_000 },
  "audio/ogg": { extension: "ogg", mediaType: "audio", max: 20_000_000 },
  "video/mp4": { extension: "mp4", mediaType: "video", max: 80_000_000 },
  "video/webm": { extension: "webm", mediaType: "video", max: 80_000_000 },
  "model/gltf-binary": { extension: "glb", mediaType: "model_3d", max: 50_000_000 },
} as const;

type AllowedMime = keyof typeof MIME_RULES;

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function statusCode(error: unknown): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    return Number((error as { statusCode: unknown }).statusCode) || 500;
  }
  return 500;
}

function isExpectedSignature(mime: AllowedMime, bytes: Uint8Array): boolean {
  const ascii = String.fromCharCode(...bytes);
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && ascii.slice(1, 4) === "PNG";
    case "image/webp":
      return ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP";
    case "image/avif":
      return ascii.slice(4, 8) === "ftyp" && ascii.slice(8, 12).includes("avif");
    case "audio/mpeg":
      return ascii.slice(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    case "audio/wav":
      return ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WAVE";
    case "audio/ogg":
      return ascii.slice(0, 4) === "OggS";
    case "video/mp4":
      return ascii.slice(4, 8) === "ftyp";
    case "video/webm":
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "model/gltf-binary":
      return ascii.slice(0, 4) === "glTF";
  }
}

function folder(metadata: z.infer<typeof uploadMetadataSchema>): string {
  if (
    metadata.usageType === "social" ||
    metadata.usageType === "story" ||
    metadata.usageType === "advertising"
  ) {
    return "social";
  }
  if (metadata.mediaType === "audio") return "audio";
  if (metadata.mediaType === "video") return "video";
  if (metadata.mediaType === "spin_360" || metadata.mediaType === "model_3d") return "360";
  if (metadata.mediaType === "document") return "archive";
  return "images";
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function firstBytes(stream: ReadableStream<Uint8Array>, count: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (received < count) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const output = new Uint8Array(Math.min(received, count));
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = output.length - offset;
    if (remaining <= 0) break;
    const slice = chunk.subarray(0, remaining);
    output.set(slice, offset);
    offset += slice.length;
  }
  return output;
}

async function listProductMedia(request: Request, env: Env, productId: string): Promise<Response> {
  await authenticateAdminRequest(request, env, "catalog.read");
  const [product, media, audio, spin, animation, spinFrames] = await Promise.all([
    env.DB.prepare(
      `
      SELECT id, slug, name, status, tagline, short_description, description, story,
             category, material, dimensions_text, weight_g, rights_status, rights_notes,
             seo_title, seo_description, search_terms, version, updated_at
      FROM products
      WHERE id = ?1 AND product_type = 'music_box'
    `,
    )
      .bind(productId)
      .first(),
    env.DB.prepare(
      `
      SELECT id, media_type, r2_key, source_url, alt_text, mime_type, width, height,
             duration_seconds, slot_code, title, promo_text_ro, tags_json, usage_type,
             marketing_approved, public_access, sync_to_avyron, status, rights_status,
             sort_order, is_primary, version, created_at, updated_at
      FROM product_media
      WHERE product_id = ?1 AND status != 'archived'
      ORDER BY CASE slot_code
        WHEN '01_hero' THEN 1 WHEN '02_decor' THEN 2 WHEN '03_closed' THEN 3
        WHEN '04_dimensions' THEN 4 WHEN '05_mechanism' THEN 5 WHEN '06_melody' THEN 6
        ELSE 99 END, sort_order, created_at
    `,
    )
      .bind(productId)
      .all(),
    env.DB.prepare("SELECT * FROM product_audio_config WHERE product_id = ?1")
      .bind(productId)
      .first(),
    env.DB.prepare("SELECT * FROM product_360_config WHERE product_id = ?1")
      .bind(productId)
      .first(),
    env.DB.prepare("SELECT * FROM product_animation_config WHERE product_id = ?1")
      .bind(productId)
      .first(),
    env.DB.prepare(
      `
      SELECT pf.media_id, pf.frame_index, pf.angle_degrees
      FROM product_360_frames pf
      JOIN product_media pm ON pm.id = pf.media_id
      WHERE pf.product_id = ?1 AND pm.status != 'archived'
      ORDER BY pf.frame_index
    `,
    )
      .bind(productId)
      .all(),
  ]);
  if (!product) return json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });
  return json({
    data: {
      product,
      media: media.results,
      audio,
      spin360: spin ? { ...spin, frames: spinFrames.results } : null,
      animation,
    },
  });
}

async function uploadProductMedia(
  request: Request,
  env: Env,
  productId: string,
): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "catalog.write");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const declaredSize = Number(
    request.headers.get("x-media-size") ?? request.headers.get("content-length") ?? 0,
  );
  if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > 52_000_000) {
    return json({ error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413 });
  }

  const product = await env.DB.prepare(
    "SELECT id FROM products WHERE id = ?1 AND product_type = 'music_box'",
  )
    .bind(productId)
    .first();
  if (!product) return json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });

  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
  const encodedMetadata = request.headers.get("x-media-metadata");
  const encodedFilename = request.headers.get("x-media-filename");
  if (!request.body || !encodedMetadata || !encodedFilename) {
    return json({ error: { code: "INVALID_STREAM_UPLOAD" } }, { status: 400 });
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeURIComponent(encodedMetadata));
  } catch {
    return json({ error: { code: "INVALID_METADATA" } }, { status: 400 });
  }
  const parsed = uploadMetadataSchema.safeParse(decoded);
  const rule = MIME_RULES[contentType as AllowedMime];
  const metadataMatchesMime =
    parsed.success &&
    rule &&
    (rule.mediaType === parsed.data.mediaType ||
      (parsed.data.mediaType === "spin_360" && rule.mediaType === "image"));
  if (!parsed.success || !rule || !metadataMatchesMime || declaredSize > rule.max) {
    return json(
      {
        error: {
          code: "INVALID_MEDIA",
          message: "Tipul sau dimensiunea fișierului nu este permisă.",
        },
      },
      { status: 400 },
    );
  }
  const [inspectionStream, uploadStream] = request.body.tee();
  const signature = await firstBytes(inspectionStream, 16);
  if (!isExpectedSignature(contentType as AllowedMime, signature)) {
    await uploadStream.cancel().catch(() => undefined);
    return json({ error: { code: "INVALID_FILE_SIGNATURE" } }, { status: 400 });
  }

  const assetId = `media_${crypto.randomUUID().replaceAll("-", "")}`;
  const key = `products/${productId}/${folder(parsed.data)}/${assetId}.${rule.extension}`;
  const storedObject = await env.MEDIA.put(key, uploadStream, {
    httpMetadata: { contentType, cacheControl: "public, max-age=3600" },
    customMetadata: { productId, assetId, uploadedBy: admin.id },
  });
  if (storedObject.size !== declaredSize || storedObject.size > rule.max) {
    await env.MEDIA.delete(key);
    return json({ error: { code: "MEDIA_SIZE_MISMATCH" } }, { status: 400 });
  }

  try {
    const statements: D1PreparedStatement[] = [];
    if (parsed.data.slotCode) {
      statements.push(
        env.DB.prepare(
          `
        UPDATE product_media
        SET status = 'archived', public_access = 0, sync_to_avyron = 0,
            is_primary = 0, archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE product_id = ?1 AND slot_code = ?2 AND status != 'archived'
      `,
        ).bind(productId, parsed.data.slotCode),
      );
    }
    statements.push(
      env.DB.prepare(
        `
      INSERT INTO product_media (
        id, product_id, media_type, r2_key, alt_text, mime_type, file_format,
        file_size_bytes, original_filename, slot_code, title, promo_text_ro,
        tags_json, usage_type, sync_to_avyron, status, rights_status, sort_order, is_primary
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
        ?13, ?14, ?15, 'draft', 'review_required', ?16, ?17
      )
    `,
      ).bind(
        assetId,
        productId,
        parsed.data.mediaType,
        key,
        parsed.data.altText || null,
        contentType,
        rule.extension,
        storedObject.size,
        decodeURIComponent(encodedFilename),
        parsed.data.slotCode ?? null,
        parsed.data.title || null,
        parsed.data.promoTextRo || null,
        JSON.stringify(parsed.data.tags),
        parsed.data.usageType,
        parsed.data.syncToAvyron ? 1 : 0,
        parsed.data.slotCode ? Number(parsed.data.slotCode.slice(0, 2)) : 100,
        parsed.data.slotCode === "01_hero" ? 1 : 0,
      ),
    );
    statements.push(
      env.DB.prepare(
        `
      INSERT INTO audit_log (
        id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
        after_json, metadata_json
      ) VALUES (?1, ?2, ?3, 'media.upload', 'product_media', ?4, ?5, ?6)
    `,
      ).bind(
        crypto.randomUUID(),
        admin.id,
        admin.email,
        assetId,
        JSON.stringify({
          productId,
          slotCode: parsed.data.slotCode,
          mediaType: parsed.data.mediaType,
        }),
        JSON.stringify({ size: storedObject.size, mime: contentType }),
      ),
    );
    await env.DB.batch(statements);
  } catch (error) {
    await env.MEDIA.delete(key);
    throw error;
  }

  await env.CACHE.delete("catalog:public:v1");
  return json(
    { data: { id: assetId, status: "draft", url: `/media/${assetId}` } },
    { status: 201 },
  );
}

async function updateMedia(request: Request, env: Env, mediaId: string): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "catalog.write");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const parsed = updateMetadataSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: { code: "INVALID_MEDIA_UPDATE" } }, { status: 400 });
  const current = await env.DB.prepare(
    `
    SELECT id, product_id, marketing_approved, public_access, sync_to_avyron,
           rights_status, status, version
    FROM product_media WHERE id = ?1
  `,
  )
    .bind(mediaId)
    .first<Record<string, string | number | null>>();
  if (!current) return json({ error: { code: "MEDIA_NOT_FOUND" } }, { status: 404 });
  if (Number(current.version) !== parsed.data.expectedVersion) {
    return json({ error: { code: "VERSION_CONFLICT" } }, { status: 409 });
  }

  const approved = parsed.data.marketingApproved ?? Boolean(current.marketing_approved);
  const rights = parsed.data.rightsStatus ?? String(current.rights_status);
  const publicAccess = parsed.data.publicAccess ?? Boolean(current.public_access);
  const syncToAvyron = parsed.data.syncToAvyron ?? Boolean(current.sync_to_avyron);
  const nextStatus = parsed.data.status ?? String(current.status);
  if (
    (publicAccess || syncToAvyron || nextStatus === "active") &&
    (!approved || rights !== "cleared")
  ) {
    return json(
      {
        error: {
          code: "APPROVAL_REQUIRED",
          message: "Publicarea și sincronizarea cer aprobare marketing și drepturi validate.",
        },
      },
      { status: 409 },
    );
  }

  const result = await env.DB.prepare(
    `
    UPDATE product_media
    SET title = COALESCE(?1, title),
        promo_text_ro = COALESCE(?2, promo_text_ro),
        alt_text = COALESCE(?3, alt_text),
        tags_json = COALESCE(?4, tags_json),
        marketing_approved = ?5,
        public_access = ?6,
        sync_to_avyron = ?7,
        rights_status = ?8,
        status = ?9,
        archived_at = CASE WHEN ?9 = 'archived' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE archived_at END,
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?10 AND version = ?11
  `,
  )
    .bind(
      parsed.data.title ?? null,
      parsed.data.promoTextRo ?? null,
      parsed.data.altText ?? null,
      parsed.data.tags ? JSON.stringify(parsed.data.tags) : null,
      approved ? 1 : 0,
      publicAccess ? 1 : 0,
      syncToAvyron ? 1 : 0,
      rights,
      nextStatus,
      mediaId,
      parsed.data.expectedVersion,
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
    ) VALUES (?1, ?2, ?3, 'media.update', 'product_media', ?4, ?5, '{}')
  `,
  )
    .bind(crypto.randomUUID(), admin.id, admin.email, mediaId, JSON.stringify(parsed.data))
    .run();
  await env.CACHE.delete("catalog:public:v1");
  return json({ data: { id: mediaId, version: parsed.data.expectedVersion + 1 } });
}

async function previewMedia(request: Request, env: Env, mediaId: string): Promise<Response> {
  await authenticateAdminRequest(request, env, "catalog.read");
  const media = await env.DB.prepare(
    `
    SELECT r2_key, mime_type
    FROM product_media
    WHERE id = ?1 AND r2_key IS NOT NULL AND status != 'archived'
  `,
  )
    .bind(mediaId)
    .first<{ r2_key: string; mime_type: string | null }>();
  if (!media) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(media.r2_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  if (!headers.has("content-type") && media.mime_type) headers.set("content-type", media.mime_type);
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

export async function handleAdminMediaApi(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const productMatch = path.match(/^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/media$/);
  const mediaMatch = path.match(/^\/api\/v1\/admin\/media\/([a-zA-Z0-9_-]+)$/);
  const contentMatch = path.match(/^\/api\/v1\/admin\/media\/([a-zA-Z0-9_-]+)\/content$/);
  if (!productMatch && !mediaMatch && !contentMatch) return null;

  try {
    if (contentMatch) {
      if (request.method === "GET" || request.method === "HEAD") {
        return previewMedia(request, env, contentMatch[1]);
      }
      return json(
        { error: { code: "METHOD_NOT_ALLOWED" } },
        { status: 405, headers: { allow: "GET, HEAD" } },
      );
    }
    if (productMatch) {
      if (request.method === "GET") return listProductMedia(request, env, productMatch[1]);
      if (request.method === "POST") return uploadProductMedia(request, env, productMatch[1]);
      return json(
        { error: { code: "METHOD_NOT_ALLOWED" } },
        { status: 405, headers: { allow: "GET, POST" } },
      );
    }
    if (request.method === "PATCH") return updateMedia(request, env, mediaMatch![1]);
    return json(
      { error: { code: "METHOD_NOT_ALLOWED" } },
      { status: 405, headers: { allow: "PATCH" } },
    );
  } catch (error) {
    const status = statusCode(error);
    console.error("admin.media.failed", error);
    return json(
      {
        error: {
          code:
            status === 401
              ? "UNAUTHORIZED"
              : status === 403
                ? "FORBIDDEN"
                : "MEDIA_OPERATION_FAILED",
          message:
            status >= 500 ? "Operația media nu a putut fi finalizată." : (error as Error).message,
        },
      },
      { status },
    );
  }
}
