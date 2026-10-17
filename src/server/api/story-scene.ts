import { localMediaPreview } from "../media-policy";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { pcmWavDuration } from "@/lib/audio-clip";
import {
  storySceneSettingsBaseSchema,
  storySceneSettingsSchema,
  type StoryScenePublic,
} from "@/lib/story-scene";
import { parseMediaRangeHeader } from "../media-public";
import { boundedBytes, boundedJson } from "./bounded-json";

const adminPath = "/api/v1/admin/story-scene";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
const error = (message: string, status = 400) => json({ error: { message } }, status);
type Asset = { id: string; r2_key: string; duration_seconds: number; byte_size: number };
type Settings = {
  audio_asset_id: string | null;
  track_title: string;
  enabled: number;
  preview_enabled: number;
  rights_confirmed: number;
  version: number;
};

async function serveAudio(request: Request, env: Env, asset: Asset) {
  const rangeHeader = request.headers.get("range");
  const range = parseMediaRangeHeader(rangeHeader, asset.byte_size);
  const headers = new Headers({
    "cache-control": "private, no-store",
    "content-type": "audio/wav",
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
  });
  if (rangeHeader && !range) {
    headers.set("content-range", `bytes */${asset.byte_size}`);
    return new Response(null, { status: 416, headers });
  }
  const object = await env.MEDIA.get(
    asset.r2_key,
    range ? { range: { offset: range.start, length: range.length } } : undefined,
  );
  if (!object || !("body" in object)) return error("Fragment indisponibil.", 404);
  headers.set("content-length", String(range?.length ?? asset.byte_size));
  if (range) headers.set("content-range", `bytes ${range.start}-${range.end}/${asset.byte_size}`);
  if (request.method === "HEAD") await object.body.cancel();
  return new Response(request.method === "HEAD" ? null : object.body, {
    status: range ? 206 : 200,
    headers,
  });
}

export async function handleStoryScene(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const publicAudio = path.match(/^\/api\/v1\/story\/audio\/([a-f0-9-]{36})$/);
  const preview = path.match(/^\/api\/v1\/admin\/story-scene\/audio\/([a-f0-9-]{36})$/);
  const isAdmin = path === adminPath || path === `${adminPath}/audio` || !!preview;
  if (path !== "/api/v1/story/scene" && !publicAudio && !isAdmin) return null;
  try {
    if (!isAdmin) {
      if (request.method !== "GET" && request.method !== "HEAD")
        return error("Metodă nepermisă.", 405);
      const asset = await env.DB.prepare(
        `SELECT a.*,s.track_title FROM story_scene_settings s JOIN story_audio_assets a ON a.id=s.audio_asset_id WHERE s.id='about' AND ((s.enabled=1 AND s.rights_confirmed=1)${localMediaPreview(env) ? " OR s.preview_enabled=1" : ""})`,
      ).first<Asset & { track_title: string }>();
      if (publicAudio) {
        if (!asset || asset.id !== publicAudio[1]) return error("Fragment indisponibil.", 404);
        return await serveAudio(request, env, asset);
      }
      const data: StoryScenePublic = {
        audio: asset
          ? {
              url: `/api/v1/story/audio/${asset.id}`,
              title: asset.track_title,
              duration: asset.duration_seconds,
            }
          : null,
      };
      return request.method === "HEAD"
        ? new Response(null, { headers: { "cache-control": "no-store" } })
        : json({ data });
    }
    const read = request.method === "GET" || request.method === "HEAD";
    const admin = await authenticateAdminRequest(
      request,
      env,
      read ? "integrations.read" : "integrations.write",
    );
    if (read && preview) {
      const asset = await env.DB.prepare("SELECT * FROM story_audio_assets WHERE id=?1")
        .bind(preview[1])
        .first<Asset>();
      return asset ? await serveAudio(request, env, asset) : error("Fragment inexistent.", 404);
    }
    if (request.method === "GET" && path === adminPath) {
      const settings = await env.DB.prepare(
        "SELECT * FROM story_scene_settings WHERE id='about'",
      ).first<Settings>();
      if (!settings) return error("Configurarea nu este disponibilă.", 503);
      const assets = await env.DB.prepare(
        "SELECT id,duration_seconds AS duration,created_at AS createdAt FROM story_audio_assets ORDER BY created_at DESC",
      ).all();
      return json({
        data: {
          developmentPreview: localMediaPreview(env),
          settings: {
            assetId: settings.audio_asset_id,
            title: settings.track_title,
            enabled: !!settings.enabled || (localMediaPreview(env) && !!settings.preview_enabled),
            rightsConfirmed: !!settings.rights_confirmed,
            version: settings.version,
          },
          assets: assets.results,
        },
      });
    }
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return error("Origine nepermisă.", 403);
    if (request.method === "POST" && path === `${adminPath}/audio`) {
      if (request.headers.get("content-type") !== "audio/wav")
        return error("Încarcă un fragment WAV pregătit de editor.", 415);
      const bytes = await boundedBytes(request, 3_000_000);
      const duration = pcmWavDuration(bytes.subarray(0, 44), bytes.byteLength);
      if (duration === null || duration < 15 || duration > 30)
        return error("Fragmentul trebuie să fie PCM WAV, între 15 și 30 de secunde.");
      const id = crypto.randomUUID(),
        key = `story-audio/${id}.wav`,
        now = new Date().toISOString();
      const stored = await env.MEDIA.put(key, bytes, {
        httpMetadata: { contentType: "audio/wav" },
      });
      if (!stored) return error("Fragmentul nu a putut fi stocat. Reîncearcă.", 503);
      try {
        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO story_audio_assets(id,r2_key,duration_seconds,byte_size,created_by,created_at) VALUES(?1,?2,?3,?4,?5,?6)",
          ).bind(id, key, duration, bytes.byteLength, admin.id, now),
          env.DB.prepare(
            "INSERT INTO business_activity(id,actor_id,action,entity_id,created_at) VALUES(?1,?2,'story.audio.uploaded',?3,?4)",
          ).bind(crypto.randomUUID(), admin.id, id, now),
        ]);
      } catch (e) {
        await env.MEDIA.delete(key);
        throw e;
      }
      return json({ data: { id } }, 201);
    }
    if (request.method !== "PUT" || path !== adminPath) return error("Metodă nepermisă.", 405);
    const parsed = (
      localMediaPreview(env)
        ? storySceneSettingsBaseSchema.refine((v) => !v.enabled || !!v.assetId)
        : storySceneSettingsSchema
    ).safeParse(await boundedJson(request, 4096));
    if (!parsed.success)
      return error("Alege fragmentul, completează titlul și confirmă drepturile pentru activare.");
    const s = parsed.data;
    if (s.assetId) {
      const asset = await env.DB.prepare("SELECT * FROM story_audio_assets WHERE id=?1")
        .bind(s.assetId)
        .first<Asset>();
      if (!asset || !(await env.MEDIA.head(asset.r2_key)))
        return error("Fragmentul ales nu este disponibil.", 409);
    }
    const now = new Date().toISOString();
    const saved = await env.DB.batch([
      env.DB.prepare(
        "UPDATE story_scene_settings SET audio_asset_id=?1,track_title=?2,enabled=?3,rights_confirmed=?4,version=version+1,updated_by=?5,updated_at=?6,preview_enabled=?8 WHERE id='about' AND version=?7",
      ).bind(
        s.assetId,
        s.title,
        Number(s.enabled && s.rightsConfirmed),
        Number(s.rightsConfirmed),
        admin.id,
        now,
        s.expectedVersion,
        Number(localMediaPreview(env) && s.enabled && !s.rightsConfirmed),
      ),
      env.DB.prepare(
        "INSERT INTO business_activity(id,actor_id,action,entity_id,created_at) SELECT ?1,?2,'story.scene.saved','about',?3 WHERE changes()=1",
      ).bind(crypto.randomUUID(), admin.id, now),
    ]);
    if (!saved[0].meta.changes)
      return error(
        "Alt administrator a modificat scena. Reîncarcă setările înainte de salvare.",
        409,
      );
    return json({ data: { saved: true } });
  } catch (e) {
    const code = e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : 500;
    return error(
      code === 401 || code === 403
        ? "Acces nepermis."
        : code === 413
          ? "Fragmentul este prea mare."
          : "Scena nu este disponibilă momentan.",
      code,
    );
  }
}
