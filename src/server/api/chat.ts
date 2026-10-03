import { createChatConversationSchema, visitorChatMessageSchema } from "@/lib/chat-contracts";
import {
  addVisitorMessage,
  createChatConversation,
  getChatSettings,
  listVisitorMessages,
  sha256,
  verifyChatAccess,
} from "@/server/db/chat.repository";

const CHAT_PREFIX = "/api/v1/chat";
const MAX_BODY_BYTES = 8_192;

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, { status });
}

function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestOrigin = new URL(request.url).origin;
  const siteOrigin = new URL(env.PUBLIC_SITE_URL).origin;
  return (
    origin === requestOrigin || origin === siteOrigin || origin === "https://app.cutiutamagica.eu"
  );
}

async function parseJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new Response(null, { status: 413 });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new Response(null, { status: 415 });
  }
  return request.json();
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

function publicAvailability(mode: "online" | "offline" | "auto"): "online" | "offline" {
  if (mode !== "auto") return mode;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? -1);
  return weekday && !["Sat", "Sun"].includes(weekday) && hour >= 9 && hour < 18
    ? "online"
    : "offline";
}

async function rateLimited(
  env: Env,
  request: Request,
  scope: string,
  limit: number,
  seconds: number,
): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = `rate:chat:${scope}:${await sha256(ip)}:${bucket}`;
  const current = Number((await env.CACHE.get(key)) ?? 0);
  if (current >= limit) return true;
  await env.CACHE.put(key, String(current + 1), { expirationTtl: seconds + 10 });
  return false;
}

export async function handleChatApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== CHAT_PREFIX && !url.pathname.startsWith(`${CHAT_PREFIX}/`)) return null;
  if (!isAllowedOrigin(request, env))
    return error("ORIGIN_NOT_ALLOWED", "Originea nu este permisă.", 403);

  if (url.pathname === `${CHAT_PREFIX}/config`) {
    if (request.method !== "GET") return error("METHOD_NOT_ALLOWED", "Metodă nepermisă.", 405);
    const settings = await getChatSettings(env.DB);
    return json({
      data: {
        enabled: settings.enabled,
        availability: publicAvailability(settings.availability),
        availabilityMode: settings.availability,
        position: settings.position,
        accentColor: settings.accentColor,
        welcomeTitle: settings.welcomeTitle,
        welcomeMessage: settings.welcomeMessage,
        offlineMessage: settings.offlineMessage,
        responseTimeLabel: settings.responseTimeLabel,
        requireConsent: settings.requireConsent,
        collectName: settings.collectName,
        collectEmail: settings.collectEmail,
        quickReplies: settings.quickReplies,
      },
    });
  }

  if (url.pathname === `${CHAT_PREFIX}/conversations`) {
    if (request.method !== "POST") return error("METHOD_NOT_ALLOWED", "Metodă nepermisă.", 405);
    if (await rateLimited(env, request, "conversation", 5, 600)) {
      return error("RATE_LIMITED", "Ai deschis prea multe conversații. Încearcă mai târziu.", 429);
    }
    try {
      const settings = await getChatSettings(env.DB);
      if (!settings.enabled)
        return error("CHAT_DISABLED", "Chatul este momentan indisponibil.", 503);
      const parsed = createChatConversationSchema.safeParse(await parseJson(request));
      if (!parsed.success)
        return error("INVALID_REQUEST", "Datele conversației nu sunt valide.", 400);
      if (settings.requireConsent && !parsed.data.consent) {
        return error("CONSENT_REQUIRED", "Este necesar acordul pentru procesarea mesajului.", 400);
      }
      const session = await createChatConversation(env.DB, parsed.data);
      return json({ data: session }, { status: 201 });
    } catch (caught) {
      if (caught instanceof Response) {
        if (caught.status === 413)
          return error("PAYLOAD_TOO_LARGE", "Cererea este prea mare.", 413);
        if (caught.status === 415)
          return error("UNSUPPORTED_MEDIA_TYPE", "Trimite date JSON.", 415);
      }
      throw caught;
    }
  }

  const match = url.pathname.match(/^\/api\/v1\/chat\/conversations\/([0-9a-f-]+)\/messages$/i);
  if (!match) return error("NOT_FOUND", "Resursa nu există.", 404);
  const conversationId = match[1];
  const token = bearerToken(request);
  if (!token || !(await verifyChatAccess(env.DB, conversationId, token))) {
    return error("UNAUTHORIZED", "Conversația nu poate fi accesată.", 401);
  }

  if (request.method === "GET") {
    return json({ data: await listVisitorMessages(env.DB, conversationId) });
  }
  if (request.method === "POST") {
    if (await rateLimited(env, request, `message:${conversationId}`, 24, 60)) {
      return error("RATE_LIMITED", "Trimite mesajele puțin mai rar.", 429);
    }
    try {
      const parsed = visitorChatMessageSchema.safeParse(await parseJson(request));
      if (!parsed.success) return error("INVALID_MESSAGE", "Mesajul nu este valid.", 400);
      await addVisitorMessage(env.DB, conversationId, parsed.data.messageId, parsed.data.body);
      return json({ data: { accepted: true } }, { status: 201 });
    } catch (caught) {
      if (caught instanceof Response) {
        if (caught.status === 413)
          return error("PAYLOAD_TOO_LARGE", "Mesajul este prea mare.", 413);
        if (caught.status === 415)
          return error("UNSUPPORTED_MEDIA_TYPE", "Trimite date JSON.", 415);
      }
      throw caught;
    }
  }
  return error("METHOD_NOT_ALLOWED", "Metodă nepermisă.", 405);
}
