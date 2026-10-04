import { localMediaPreview, mediaApprovalSql } from "../media-policy";
function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

type SpinConfig = {
  enabled: number;
  spin_type: "image_sequence" | "turntable_video" | "glb_model";
  cover_media_id: string | null;
  primary_media_id: string | null;
  frame_count: number;
  status: string;
};

export async function getPublicProductExperience(env: Env, slug: string): Promise<Response> {
  const product = await env.DB.prepare(
    `
    SELECT id, slug, name FROM products
    WHERE slug = ?1 COLLATE NOCASE AND product_type = 'music_box' AND status = 'active' AND published_at IS NOT NULL
  `,
  )
    .bind(slug)
    .first<{ id: string; slug: string; name: string }>();
  if (!product) return json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });

  const [media, audio, spin, animation] = await Promise.all([
    env.DB.prepare(
      `
      SELECT id, media_type, slot_code, title, promo_text_ro, alt_text, mime_type,
             width, height, duration_seconds, usage_type, sort_order
      FROM product_media pm
      WHERE product_id = ?1 AND status = 'active' AND public_access = 1
        AND ${mediaApprovalSql("pm", localMediaPreview(env))}
        AND slot_code IS NOT NULL
      ORDER BY sort_order, created_at
    `,
    )
      .bind(product.id)
      .all(),
    env.DB.prepare(
      `
      SELECT pac.display_name, pm.id AS media_id, pm.mime_type, pm.duration_seconds
      FROM product_audio_config pac
      JOIN product_media pm ON pm.id = pac.media_id
      WHERE pac.product_id = ?1 AND pac.public_enabled = 1 AND pac.status = 'active'
        AND pm.status = 'active' AND pm.public_access = 1 AND ${mediaApprovalSql("pm", localMediaPreview(env))}
    `,
    )
      .bind(product.id)
      .first(),
    env.DB.prepare(
      `
      SELECT sc.enabled, sc.spin_type, cover.id AS cover_media_id, primary_asset.id AS primary_media_id, sc.frame_count, sc.status
      FROM product_360_config sc
      LEFT JOIN product_media cover ON cover.id=sc.cover_media_id AND cover.status='active' AND cover.public_access=1 AND ${mediaApprovalSql("cover", localMediaPreview(env))}
      LEFT JOIN product_media primary_asset ON primary_asset.id=sc.primary_media_id AND primary_asset.status='active' AND primary_asset.public_access=1 AND ${mediaApprovalSql("primary_asset", localMediaPreview(env))}
      WHERE sc.product_id = ?1 AND sc.enabled = 1 AND sc.status = 'ready'
        AND (sc.spin_type='image_sequence' OR primary_asset.id IS NOT NULL)
    `,
    )
      .bind(product.id)
      .first<SpinConfig>(),
    env.DB.prepare(
      `
      SELECT pac.title, pac.duration_seconds, pac.autoplay_muted_preview,
             video.id AS video_media_id, poster.id AS poster_media_id
      FROM product_animation_config pac
      JOIN product_media video ON video.id = pac.video_media_id
      LEFT JOIN product_media poster ON poster.id = pac.poster_media_id AND poster.status='active' AND poster.public_access=1 AND ${mediaApprovalSql("poster", localMediaPreview(env))}
      WHERE pac.product_id = ?1 AND pac.enabled = 1 AND pac.status = 'ready'
        AND video.status = 'active' AND video.public_access = 1 AND ${mediaApprovalSql("video", localMediaPreview(env))}
    `,
    )
      .bind(product.id)
      .first(),
  ]);

  const spinFrames =
    spin?.spin_type === "image_sequence"
      ? await env.DB.prepare(
          `
        SELECT pm.id AS media_id, pf.frame_index, pf.angle_degrees
        FROM product_360_frames pf
        JOIN product_media pm ON pm.id = pf.media_id
        WHERE pf.product_id = ?1
          AND pm.status = 'active' AND pm.public_access = 1
          AND ${mediaApprovalSql("pm", localMediaPreview(env))}
        ORDER BY pf.frame_index
      `,
        )
          .bind(product.id)
          .all<{ media_id: string; frame_index: number; angle_degrees: number | null }>()
      : null;
  const completeSpin =
    spin && (spin.spin_type !== "image_sequence" || spinFrames?.results.length === spin.frame_count)
      ? {
          ...spin,
          coverUrl: spin.cover_media_id ? `/media/${spin.cover_media_id}` : null,
          primaryMediaUrl: spin.primary_media_id ? `/media/${spin.primary_media_id}` : null,
          frames:
            spinFrames?.results.map((frame) => ({
              ...frame,
              url: `/media/${frame.media_id}`,
            })) ?? [],
        }
      : null;

  return json({
    data: {
      product,
      gallery: media.results.map((item) => ({ ...item, url: `/media/${item.id}` })),
      audio: audio ? { ...audio, url: `/media/${audio.media_id}` } : null,
      spin360: completeSpin,
      animation: animation
        ? {
            ...animation,
            videoUrl: `/media/${animation.video_media_id}`,
            posterUrl: animation.poster_media_id ? `/media/${animation.poster_media_id}` : null,
          }
        : null,
    },
  });
}
