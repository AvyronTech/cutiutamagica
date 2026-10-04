import { localMediaPreview, mediaApprovalSql } from "./media-policy";
interface PublicMediaRow {
  r2_key: string;
  mime_type: string | null;
  updated_at: string;
}

export interface MediaRangeBounds {
  start: number;
  end: number;
  length: number;
}

export function parseMediaRangeHeader(value: string | null, size: number): MediaRangeBounds | null {
  if (!value || !Number.isSafeInteger(size) || size <= 0) return null;
  const match = value.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || (!match[1] && !match[2])) return null;

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    if (start < 0 || start >= size || end < start) return null;
    end = Math.min(size - 1, end);
  }

  return { start, end, length: end - start + 1 };
}

function mediaId(pathname: string): string | null {
  if (!pathname.startsWith("/media/")) return null;
  const id = decodeURIComponent(pathname.slice("/media/".length));
  if (!/^[a-zA-Z0-9_-]{3,128}$/.test(id)) return "";
  return id;
}

export async function handlePublicMediaRequest(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const id = mediaId(new URL(request.url).pathname);
  if (id === null) return null;
  if (!id) return new Response("Invalid media id", { status: 400 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const media = await env.DB.prepare(
    `
    SELECT r2_key, mime_type, updated_at
    FROM product_media pm
    WHERE id = ?1
      AND r2_key IS NOT NULL
      AND status = 'active'
      AND public_access = 1 AND ${mediaApprovalSql("pm", localMediaPreview(env))}
    LIMIT 1
  `,
  )
    .bind(id)
    .first<PublicMediaRow>();
  if (!media) return new Response("Not found", { status: 404 });

  const options: R2GetOptions = {};
  const hasConditionalHeaders =
    request.headers.has("if-match") ||
    request.headers.has("if-none-match") ||
    request.headers.has("if-modified-since") ||
    request.headers.has("if-unmodified-since");
  const rangeHeader = request.headers.get("range");
  const rangeRequested = rangeHeader !== null;
  if (hasConditionalHeaders) options.onlyIf = request.headers;
  if (rangeRequested) options.range = request.headers;

  const object = await env.MEDIA.get(media.r2_key, options);
  if (!object) return new Response("Not found", { status: 404 });
  if (!("body" in object)) {
    return new Response(null, { status: request.headers.has("if-none-match") ? 304 : 412 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
  headers.set("x-content-type-options", "nosniff");
  headers.set("accept-ranges", "bytes");
  if (!headers.has("content-type") && media.mime_type) {
    headers.set("content-type", media.mime_type);
  }

  const range = parseMediaRangeHeader(rangeHeader, object.size);
  if (range) {
    headers.set("content-range", `bytes ${range.start}-${range.end}/${object.size}`);
    headers.set("content-length", String(range.length));
  }

  return new Response(request.method === "HEAD" ? null : object.body, {
    status: range ? 206 : 200,
    headers,
  });
}
