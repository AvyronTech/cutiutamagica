import { localMediaPreview } from "../media-policy";
import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";

const audioSchema = z.object({
  section: z.literal("audio"),
  expectedVersion: z.number().int().nonnegative(),
  mediaId: z.string().min(3).max(128).nullable(),
  displayName: z.string().trim().max(120),
  publicEnabled: z.boolean(),
  status: z.enum(["disabled", "draft", "active", "processing", "failed"]),
});

const spinSchema = z.object({
  section: z.literal("spin360"),
  expectedVersion: z.number().int().nonnegative(),
  enabled: z.boolean(),
  spinType: z.enum(["image_sequence", "turntable_video", "glb_model"]),
  coverMediaId: z.string().min(3).max(128).nullable(),
  primaryMediaId: z.string().min(3).max(128).nullable(),
  frameMediaIds: z.array(z.string().min(3).max(128)).max(120),
  status: z.enum(["missing", "uploading", "processing", "ready", "failed", "disabled"]),
});

const animationSchema = z.object({
  section: z.literal("animation"),
  expectedVersion: z.number().int().nonnegative(),
  enabled: z.boolean(),
  videoMediaId: z.string().min(3).max(128).nullable(),
  posterMediaId: z.string().min(3).max(128).nullable(),
  thumbnailMediaId: z.string().min(3).max(128).nullable(),
  title: z.string().trim().max(120),
  durationSeconds: z.number().int().positive().max(3600).nullable(),
  autoplayMutedPreview: z.boolean(),
  status: z.enum(["missing", "uploading", "processing", "ready", "failed", "disabled"]),
});

const experienceSchema = z.discriminatedUnion("section", [
  audioSchema,
  spinSchema,
  animationSchema,
]);

type AdminIdentity = Awaited<ReturnType<typeof authenticateAdminRequest>>;
type MediaRow = {
  id: string;
  media_type: string;
  usage_type: string;
  status: string;
  public_access: number;
  marketing_approved: number;
  rights_status: string;
  duration_seconds: number | null;
};

class ExperienceError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

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

async function requireProduct(env: Env, productId: string): Promise<void> {
  const product = await env.DB.prepare(
    "SELECT id FROM products WHERE id = ?1 AND product_type = 'music_box'",
  )
    .bind(productId)
    .first();
  if (!product) throw new ExperienceError("PRODUCT_NOT_FOUND", 404, "Produsul nu există.");
}

async function requireMedia(
  env: Env,
  productId: string,
  mediaId: string,
  allowedTypes: string[],
  mustBePublic: boolean,
): Promise<MediaRow> {
  const media = await env.DB.prepare(
    `
    SELECT id, media_type, usage_type, status, public_access, marketing_approved, rights_status, duration_seconds
    FROM product_media
    WHERE id = ?1 AND product_id = ?2 AND status != 'archived'
  `,
  )
    .bind(mediaId, productId)
    .first<MediaRow>();
  if (!media || !allowedTypes.includes(media.media_type)) {
    throw new ExperienceError(
      "INVALID_MEDIA_REFERENCE",
      409,
      "Asset-ul nu aparține produsului sau are un tip invalid.",
    );
  }
  if (
    mustBePublic &&
    (media.status !== "active" ||
      media.public_access !== 1 ||
      (!localMediaPreview(env) &&
        (media.marketing_approved !== 1 || media.rights_status !== "cleared")))
  ) {
    throw new ExperienceError(
      "MEDIA_NOT_PUBLISHABLE",
      409,
      "Asset-ul trebuie aprobat, public și cu drepturi validate înainte de activare.",
    );
  }
  return media;
}

async function currentVersion(env: Env, table: string, productId: string): Promise<number | null> {
  const allowed = new Set([
    "product_audio_config",
    "product_360_config",
    "product_animation_config",
  ]);
  if (!allowed.has(table)) throw new Error("Invalid experience table");
  const row = await env.DB.prepare(`SELECT version FROM ${table} WHERE product_id = ?1`)
    .bind(productId)
    .first<{ version: number }>();
  return row?.version ?? null;
}

function assertVersion(actual: number | null, expected: number): void {
  if ((actual ?? 0) !== expected) {
    throw new ExperienceError(
      "VERSION_CONFLICT",
      409,
      "Configurația a fost modificată. Reîncarcă pagina.",
    );
  }
}

function auditStatement(
  env: Env,
  admin: AdminIdentity,
  productId: string,
  section: string,
  payload: unknown,
): D1PreparedStatement {
  return env.DB.prepare(
    `
    INSERT INTO audit_log (
      id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
      after_json, metadata_json
    ) VALUES (?1, ?2, ?3, 'product.experience.update', 'product', ?4, ?5, ?6)
  `,
  ).bind(
    crypto.randomUUID(),
    admin.id,
    admin.email,
    productId,
    JSON.stringify(payload),
    JSON.stringify({ section }),
  );
}

async function saveAudio(
  env: Env,
  admin: AdminIdentity,
  productId: string,
  data: z.infer<typeof audioSchema>,
): Promise<number> {
  const version = await currentVersion(env, "product_audio_config", productId);
  assertVersion(version, data.expectedVersion);
  if (data.publicEnabled && (data.status !== "active" || !data.mediaId)) {
    throw new ExperienceError("INVALID_AUDIO_STATE", 409, "Audio public necesită un fișier activ.");
  }
  if (data.mediaId) {
    const media = await requireMedia(env, productId, data.mediaId, ["audio"], data.publicEnabled);
    if (
      data.publicEnabled &&
      (media.duration_seconds == null || media.duration_seconds < 15 || media.duration_seconds > 30)
    )
      throw new ExperienceError(
        "INVALID_AUDIO_DURATION",
        409,
        "Încarcă un fragment audio verificat de 15–30 secunde.",
      );
  }

  const nextVersion = data.expectedVersion + 1;
  const statement =
    version === null
      ? env.DB.prepare(
          `
        INSERT INTO product_audio_config (
          product_id, media_id, display_name, public_enabled, status, version
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      `,
        ).bind(
          productId,
          data.mediaId,
          data.displayName || null,
          data.publicEnabled ? 1 : 0,
          data.status,
          nextVersion,
        )
      : env.DB.prepare(
          `
        UPDATE product_audio_config
        SET media_id = ?1, display_name = ?2, public_enabled = ?3, status = ?4,
            version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE product_id = ?5 AND version = ?6
      `,
        ).bind(
          data.mediaId,
          data.displayName || null,
          data.publicEnabled ? 1 : 0,
          data.status,
          productId,
          data.expectedVersion,
        );
  const results = await env.DB.batch([
    statement,
    auditStatement(env, admin, productId, data.section, data),
  ]);
  if (!results[0].success || Number(results[0].meta.changes) !== 1) {
    throw new ExperienceError("VERSION_CONFLICT", 409, "Configurația audio nu a putut fi salvată.");
  }
  return nextVersion;
}

async function saveSpin(
  env: Env,
  admin: AdminIdentity,
  productId: string,
  data: z.infer<typeof spinSchema>,
): Promise<number> {
  const version = await currentVersion(env, "product_360_config", productId);
  assertVersion(version, data.expectedVersion);
  if (data.enabled && data.status !== "ready") {
    throw new ExperienceError(
      "INVALID_360_STATE",
      409,
      "Experiența 360 poate fi activată numai când este pregătită.",
    );
  }
  if (data.enabled && data.spinType === "image_sequence" && data.frameMediaIds.length < 2) {
    throw new ExperienceError(
      "MISSING_360_FRAMES",
      409,
      "Secvența 360 necesită cel puțin două cadre.",
    );
  }
  if (data.enabled && data.spinType !== "image_sequence" && !data.primaryMediaId) {
    throw new ExperienceError(
      "MISSING_360_MEDIA",
      409,
      "Selectează fișierul principal pentru experiența 360.",
    );
  }
  const uniqueFrames = [...new Set(data.frameMediaIds)];
  if (uniqueFrames.length !== data.frameMediaIds.length) {
    throw new ExperienceError("DUPLICATE_360_FRAMES", 400, "Secvența 360 conține cadre duplicate.");
  }
  await Promise.all(
    uniqueFrames.map((id) => requireMedia(env, productId, id, ["image", "spin_360"], data.enabled)),
  );
  if (data.coverMediaId) {
    await requireMedia(env, productId, data.coverMediaId, ["image", "spin_360"], data.enabled);
  }
  if (data.primaryMediaId) {
    const expected = data.spinType === "turntable_video" ? ["video"] : ["model_3d"];
    await requireMedia(env, productId, data.primaryMediaId, expected, data.enabled);
  }

  const nextVersion = data.expectedVersion + 1;
  const statement =
    version === null
      ? env.DB.prepare(
          `
        INSERT INTO product_360_config (
          product_id, enabled, spin_type, cover_media_id, primary_media_id,
          frame_count, status, version
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `,
        ).bind(
          productId,
          data.enabled ? 1 : 0,
          data.spinType,
          data.coverMediaId,
          data.primaryMediaId,
          uniqueFrames.length,
          data.status,
          nextVersion,
        )
      : env.DB.prepare(
          `
        UPDATE product_360_config
        SET enabled = ?1, spin_type = ?2, cover_media_id = ?3, primary_media_id = ?4,
            frame_count = ?5, status = ?6, version = version + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE product_id = ?7 AND version = ?8
      `,
        ).bind(
          data.enabled ? 1 : 0,
          data.spinType,
          data.coverMediaId,
          data.primaryMediaId,
          uniqueFrames.length,
          data.status,
          productId,
          data.expectedVersion,
        );
  const statements: D1PreparedStatement[] = [
    statement,
    env.DB.prepare("DELETE FROM product_360_frames WHERE product_id = ?1").bind(productId),
    ...uniqueFrames.map((mediaId, index) =>
      env.DB.prepare(
        `
      INSERT INTO product_360_frames (product_id, media_id, frame_index, angle_degrees)
      VALUES (?1, ?2, ?3, ?4)
    `,
      ).bind(productId, mediaId, index, (index * 360) / uniqueFrames.length),
    ),
    auditStatement(env, admin, productId, data.section, data),
  ];
  const results = await env.DB.batch(statements);
  if (!results[0].success || Number(results[0].meta.changes) !== 1) {
    throw new ExperienceError("VERSION_CONFLICT", 409, "Configurația 360 nu a putut fi salvată.");
  }
  return nextVersion;
}

async function saveAnimation(
  env: Env,
  admin: AdminIdentity,
  productId: string,
  data: z.infer<typeof animationSchema>,
): Promise<number> {
  const version = await currentVersion(env, "product_animation_config", productId);
  assertVersion(version, data.expectedVersion);
  if (data.enabled && (data.status !== "ready" || !data.videoMediaId)) {
    throw new ExperienceError(
      "INVALID_ANIMATION_STATE",
      409,
      "Animația activă necesită un video pregătit.",
    );
  }
  if (data.videoMediaId) {
    await requireMedia(env, productId, data.videoMediaId, ["video"], data.enabled);
  }
  if (data.posterMediaId) {
    await requireMedia(env, productId, data.posterMediaId, ["image"], data.enabled);
  }
  if (data.thumbnailMediaId) {
    await requireMedia(env, productId, data.thumbnailMediaId, ["image"], data.enabled);
  }

  const nextVersion = data.expectedVersion + 1;
  const statement =
    version === null
      ? env.DB.prepare(
          `
        INSERT INTO product_animation_config (
          product_id, enabled, video_media_id, poster_media_id, thumbnail_media_id,
          title, duration_seconds, autoplay_muted_preview, status, version
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      `,
        ).bind(
          productId,
          data.enabled ? 1 : 0,
          data.videoMediaId,
          data.posterMediaId,
          data.thumbnailMediaId,
          data.title || null,
          data.durationSeconds,
          data.autoplayMutedPreview ? 1 : 0,
          data.status,
          nextVersion,
        )
      : env.DB.prepare(
          `
        UPDATE product_animation_config
        SET enabled = ?1, video_media_id = ?2, poster_media_id = ?3,
            thumbnail_media_id = ?4, title = ?5, duration_seconds = ?6,
            autoplay_muted_preview = ?7, status = ?8, version = version + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE product_id = ?9 AND version = ?10
      `,
        ).bind(
          data.enabled ? 1 : 0,
          data.videoMediaId,
          data.posterMediaId,
          data.thumbnailMediaId,
          data.title || null,
          data.durationSeconds,
          data.autoplayMutedPreview ? 1 : 0,
          data.status,
          productId,
          data.expectedVersion,
        );
  const results = await env.DB.batch([
    statement,
    auditStatement(env, admin, productId, data.section, data),
  ]);
  if (!results[0].success || Number(results[0].meta.changes) !== 1) {
    throw new ExperienceError(
      "VERSION_CONFLICT",
      409,
      "Configurația animației nu a putut fi salvată.",
    );
  }
  return nextVersion;
}

export async function handleAdminProductExperienceApi(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/experience$/,
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
    if (!sameOrigin(request)) {
      return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
    }
    const parsed = experienceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: { code: "INVALID_EXPERIENCE_CONFIG" } }, { status: 400 });
    }
    await requireProduct(env, match[1]);

    let version: number;
    if (parsed.data.section === "audio") {
      version = await saveAudio(env, admin, match[1], parsed.data);
    } else if (parsed.data.section === "spin360") {
      version = await saveSpin(env, admin, match[1], parsed.data);
    } else {
      version = await saveAnimation(env, admin, match[1], parsed.data);
    }
    await env.CACHE.delete("catalog:public:v1");
    return json({ data: { section: parsed.data.section, version } });
  } catch (error) {
    const status =
      error instanceof ExperienceError
        ? error.status
        : error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode: unknown }).statusCode) || 500
          : 500;
    const code =
      error instanceof ExperienceError
        ? error.code
        : status === 401
          ? "UNAUTHORIZED"
          : status === 403
            ? "FORBIDDEN"
            : "EXPERIENCE_UPDATE_FAILED";
    console.error("admin.product_experience.failed", error);
    return json(
      {
        error: {
          code,
          message: status >= 500 ? "Configurația nu a putut fi salvată." : (error as Error).message,
        },
      },
      { status },
    );
  }
}
