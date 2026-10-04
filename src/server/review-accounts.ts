import { z } from "zod";
import type { Reviewer } from "@/lib/reviews";
import { readProviderJson } from "./integrations/provider-runtime";

type CustomerOAuthEnv = Env & {
  CUSTOMER_GOOGLE_CLIENT_ID?: string;
  CUSTOMER_GOOGLE_CLIENT_SECRET?: string;
};
export const reviewFailure = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });
export const reviewJson = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { "cache-control": "private, no-store", ...headers } });
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw reviewFailure("Origine nepermisă.", 403);
}
export async function reviewRate(env: Env, keys: string[], limit: number) {
  const bucket = Math.floor(Date.now() / 900000),
    expires = (bucket + 2) * 900;
  for (const key of keys) {
    const row = await env.DB.prepare(
      "INSERT INTO review_rate_limits(key,count,expires_at) VALUES(?1,1,?2) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
      .bind(`${bucket}:${await digest(key)}`, expires)
      .first<{ count: number }>();
    if (!row || row.count > limit)
      throw reviewFailure("Prea multe încercări. Revino peste câteva minute.", 429);
  }
  await env.DB.prepare("DELETE FROM review_rate_limits WHERE expires_at<?1")
    .bind(Math.floor(Date.now() / 1000))
    .run();
}
export function requestIP(request: Request) {
  return request.headers.get("cf-connecting-ip") || "local";
}
const cookieName = "cm_reviewer";
const oauthStateCookie = "cm_customer_oauth_state";

function requestCookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + "="))
    ?.slice(name.length + 1);
}

function token(request: Request) {
  const value = requestCookie(request, cookieName);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function cookie(request: Request, value: string, seconds = 604800) {
  return `${cookieName}=${value}; Path=/api/v1/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

function oauthCookie(request: Request, value: string, seconds = 600) {
  return `${oauthStateCookie}=${value}; Path=/api/v1/reviewer/oauth/google/callback; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

function oauthReady(env: CustomerOAuthEnv) {
  return Boolean(env.CUSTOMER_GOOGLE_CLIENT_ID && env.CUSTOMER_GOOGLE_CLIENT_SECRET);
}

function randomHex(bytesLength = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytesLength)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function safeDisplayName(value: unknown, email: string) {
  const name = typeof value === "string" ? value.trim().slice(0, 60) : "";
  if (name.length >= 2) return name;
  const fallback =
    email
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .trim() ?? "";
  return fallback.length >= 2 ? fallback.slice(0, 60) : "Client Cutiuța Magică";
}

function customerRedirect(request: Request, status?: "neconfigurat" | "eroare") {
  const url = new URL("/cont", request.url);
  if (status) url.searchParams.set("auth", status);
  return Response.redirect(url.toString(), 302);
}

function sameToken(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1)
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function createReviewerSession(request: Request, env: Env, account: Reviewer) {
  const value = randomHex();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM review_sessions WHERE expires_at<?1").bind(
      Math.floor(Date.now() / 1000),
    ),
    env.DB.prepare(
      "INSERT INTO review_sessions(token_hash,account_id,expires_at) VALUES(?1,?2,?3)",
    ).bind(await digest(value), account.id, Math.floor(Date.now() / 1000) + 604800),
  ]);
  return reviewJson({ data: account }, 200, { "set-cookie": cookie(request, value) });
}

async function startGoogleOAuth(request: Request, env: CustomerOAuthEnv) {
  if (!oauthReady(env)) return customerRedirect(request, "neconfigurat");
  await reviewRate(env, ["oauth-start:" + requestIP(request)], 20);
  const state = randomHex();
  const redirectUri = new URL("/api/v1/reviewer/oauth/google/callback", request.url).toString();
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: env.CUSTOMER_GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return new Response(null, {
    status: 302,
    headers: { location: authorization.toString(), "set-cookie": oauthCookie(request, state) },
  });
}

async function finishGoogleOAuth(request: Request, env: CustomerOAuthEnv) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const expectedState = requestCookie(request, oauthStateCookie) ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (
    !oauthReady(env) ||
    !state ||
    !expectedState ||
    !sameToken(state, expectedState) ||
    !code ||
    url.searchParams.has("error")
  )
    return customerRedirect(request, "eroare");

  const redirectUri = new URL("/api/v1/reviewer/oauth/google/callback", request.url).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.CUSTOMER_GOOGLE_CLIENT_ID!,
      client_secret: env.CUSTOMER_GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    redirect: "error",
  });
  const tokenPayload = await readProviderJson(tokenResponse, 32_768);
  const tokenData = z
    .object({ access_token: z.string().min(16).max(8192), token_type: z.string() })
    .safeParse(tokenPayload);
  if (!tokenResponse.ok || !tokenData.success) return customerRedirect(request, "eroare");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokenData.data.access_token}` },
    redirect: "error",
  });
  const profilePayload = await readProviderJson(profileResponse, 32_768);
  const profile = z
    .object({
      sub: z.string().min(1).max(255),
      email: z
        .string()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      email_verified: z.boolean(),
      name: z.string().max(200).optional(),
    })
    .safeParse(profilePayload);
  if (!profileResponse.ok || !profile.success || !profile.data.email_verified)
    return customerRedirect(request, "eroare");

  const identity = await env.DB.prepare(
    `SELECT a.id,a.display_name AS displayName,a.email
     FROM review_oauth_identities oi
     JOIN review_accounts a ON a.id=oi.account_id
     WHERE oi.provider='google' AND oi.provider_subject=?1 AND a.status='active'`,
  )
    .bind(profile.data.sub)
    .first<Reviewer>();
  let account = identity;
  if (!account) {
    const existing = await env.DB.prepare(
      "SELECT id,display_name AS displayName,email FROM review_accounts WHERE email=?1 AND status='active'",
    )
      .bind(profile.data.email)
      .first<Reviewer>();
    const accountId = existing?.id ?? crypto.randomUUID();
    const displayName = safeDisplayName(profile.data.name, profile.data.email);
    const now = new Date().toISOString();
    if (existing) {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE review_accounts SET auth_mode='oauth',display_name=?2 WHERE id=?1",
        ).bind(accountId, displayName),
        env.DB.prepare(
          `INSERT INTO review_oauth_identities(provider,provider_subject,account_id,email_at_link,created_at,updated_at)
           VALUES('google',?1,?2,?3,?4,?4)`,
        ).bind(profile.data.sub, accountId, profile.data.email, now),
      ]);
    } else {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO review_accounts(
             id,email,display_name,password_hash,password_salt,status,auth_mode
           ) VALUES(?1,?2,?3,?4,?5,'active','oauth')`,
        ).bind(accountId, profile.data.email, displayName, randomHex(), randomHex(16)),
        env.DB.prepare(
          `INSERT INTO review_oauth_identities(provider,provider_subject,account_id,email_at_link,created_at,updated_at)
           VALUES('google',?1,?2,?3,?4,?4)`,
        ).bind(profile.data.sub, accountId, profile.data.email, now),
      ]);
    }
    account = { id: accountId, displayName, email: profile.data.email };
  }
  const response = await createReviewerSession(request, env, account);
  const headers = new Headers(response.headers);
  headers.append("set-cookie", oauthCookie(request, "", 0));
  headers.set("location", new URL("/cont", request.url).toString());
  return new Response(null, { status: 302, headers });
}
export async function currentReviewer(request: Request, env: Env): Promise<Reviewer | null> {
  const value = token(request);
  if (!value) return null;
  return env.DB.prepare(
    "SELECT a.id,a.display_name AS displayName,a.email FROM review_sessions s JOIN review_accounts a ON a.id=s.account_id WHERE s.token_hash=?1 AND s.expires_at>?2 AND a.status='active'",
  )
    .bind(await digest(value), Math.floor(Date.now() / 1000))
    .first<Reviewer>();
}
export async function handleReviewAccount(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/v1/reviewer")) return null;
  try {
    const customerEnv = env as CustomerOAuthEnv;
    if (path === "/api/v1/reviewer/providers" && request.method === "GET")
      return reviewJson({ data: { google: { enabled: oauthReady(customerEnv) } } });
    if (path === "/api/v1/reviewer/oauth/google" && request.method === "GET")
      return startGoogleOAuth(request, customerEnv);
    if (path === "/api/v1/reviewer/oauth/google/callback" && request.method === "GET")
      return finishGoogleOAuth(request, customerEnv);
    if (path === "/api/v1/reviewer" && request.method === "GET")
      return reviewJson({ data: await currentReviewer(request, env) });
    if (request.method !== "POST") throw reviewFailure("Metodă nepermisă.", 405);
    sameOrigin(request);
    if (path === "/api/v1/reviewer/logout") {
      const value = token(request);
      if (value)
        await env.DB.prepare("DELETE FROM review_sessions WHERE token_hash=?1")
          .bind(await digest(value))
          .run();
      return reviewJson({ data: { signedOut: true } }, 200, {
        "set-cookie": cookie(request, "", 0),
      });
    }
    if (["/api/v1/reviewer/login", "/api/v1/reviewer/register"].includes(path))
      throw reviewFailure("Conturile clienților folosesc autentificarea securizată Google.", 410);
    throw reviewFailure("Pagina nu există.", 404);
  } catch (error) {
    if (path === "/api/v1/reviewer/oauth/google/callback") {
      console.error("customer.oauth_callback_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return customerRedirect(request, "eroare");
    }
    const status =
      error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
    return reviewJson(
      {
        error: {
          message:
            status === 500 ? "Nu am putut accesa contul. Reîncearcă." : (error as Error).message,
        },
      },
      status,
    );
  }
}
