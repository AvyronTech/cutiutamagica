import { z } from "zod";
import type { Reviewer } from "@/lib/reviews";
import { readProviderJson } from "./integrations/provider-runtime";
import { credential } from "./services/growth-settings";
import { hasEmailTransport, sendEmail } from "./integrations/resend";
import { boundedJson } from "./api/bounded-json";
import type { CommerceEnv } from "./integrations/provider-runtime";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import {
  hashCustomerPassword,
  normalizeCustomerPhone,
  verifyCustomerPassword,
} from "./customer-password";

type CustomerOAuthEnv = Env & {
  CUSTOMER_GOOGLE_CLIENT_ID?: string;
  CUSTOMER_GOOGLE_CLIENT_SECRET?: string;
  CUSTOMER_APPLE_CLIENT_ID?: string;
  CUSTOMER_APPLE_TEAM_ID?: string;
  CUSTOMER_APPLE_KEY_ID?: string;
  CUSTOMER_APPLE_PRIVATE_KEY?: string;
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
const appleStateCookie = "cm_customer_apple_state";
const customerEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});
const customerCodeSchema = customerEmailSchema.extend({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{8}$/),
});
const customerPasswordSchema = z.string().min(12).max(128);
const customerLoginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional(),
});
const customerPasswordSetupSchema = z.object({
  password: customerPasswordSchema,
  phone: z.string().trim().max(32).optional(),
});

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
  return `${oauthStateCookie}=${value}; Path=/api/v1/reviewer/oauth/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

function appleOauthCookie(value: string, seconds = 600) {
  return `${appleStateCookie}=${value}; Path=/api/v1/reviewer/oauth/apple/callback; HttpOnly; SameSite=None; Secure; Max-Age=${seconds}`;
}

async function googleOAuthCredentials(env: CustomerOAuthEnv) {
  const runtime = env as CommerceEnv;
  const [clientId, clientSecret] = await Promise.all([
    credential(runtime, "customer_google_client_id"),
    credential(runtime, "customer_google_client_secret"),
  ]);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function appleOAuthCredentials(env: CustomerOAuthEnv) {
  const {
    CUSTOMER_APPLE_CLIENT_ID: clientId,
    CUSTOMER_APPLE_TEAM_ID: teamId,
    CUSTOMER_APPLE_KEY_ID: keyId,
    CUSTOMER_APPLE_PRIVATE_KEY: privateKey,
  } = env;
  return clientId && teamId && keyId && privateKey
    ? { clientId, teamId, keyId, privateKey: privateKey.replace(/\\n/g, "\n") }
    : null;
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

async function createReviewerSession(
  request: Request,
  env: Env,
  account: Reviewer,
  remember = false,
) {
  const value = randomHex();
  const lifetime = remember ? 30 * 86400 : 86400;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM review_sessions WHERE expires_at<?1").bind(
      Math.floor(Date.now() / 1000),
    ),
    env.DB.prepare(
      "INSERT INTO review_sessions(token_hash,account_id,expires_at) VALUES(?1,?2,?3)",
    ).bind(await digest(value), account.id, Math.floor(Date.now() / 1000) + lifetime),
  ]);
  return reviewJson({ data: account }, 200, { "set-cookie": cookie(request, value, lifetime) });
}

async function startCustomerEmailLogin(request: Request, env: Env) {
  const data = customerEmailSchema.parse(await boundedJson(request, 2_000));
  await reviewRate(
    env,
    [`customer-email-ip:${requestIP(request)}`, `customer-email-address:${data.email}`],
    5,
  );
  if (!(await hasEmailTransport(env)))
    throw reviewFailure("Autentificarea prin e-mail nu este disponibilă momentan.", 503);

  const challengeId = crypto.randomUUID();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 100_000_000).padStart(8, "0");
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM customer_login_challenges WHERE expires_at<?1").bind(
      Math.floor(Date.now() / 1000),
    ),
    env.DB.prepare(
      `INSERT INTO customer_login_challenges(id,email_normalized,code_hash,expires_at)
       VALUES(?1,?2,?3,?4)`,
    ).bind(challengeId, data.email, await digest(`${challengeId}:${code}`), expiresAt),
  ]);
  try {
    await sendEmail(env, {
      to: data.email,
      subject: "Codul tău de acces · Cutiuța Magică",
      text: `Codul tău de acces este ${code}. Este valabil 10 minute. Dacă nu ai cerut acest cod, ignoră mesajul.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#302219"><p>Cutiuța Magică</p><h1>Intră în povestea ta</h1><p>Codul tău de acces este:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>Este valabil 10 minute. Dacă nu ai cerut acest cod, ignoră mesajul.</p></div>`,
      idempotencyKey: `customer-login/${challengeId}`,
      entityType: "customer_login_challenge",
      entityId: challengeId,
    });
  } catch (error) {
    await env.DB.prepare("DELETE FROM customer_login_challenges WHERE id=?1")
      .bind(challengeId)
      .run();
    throw error;
  }
  return reviewJson({ data: { challengeId, expiresInSeconds: 600 } });
}

async function verifyCustomerEmailLogin(request: Request, env: Env) {
  const data = customerCodeSchema
    .extend({ remember: z.boolean().optional() })
    .parse(await boundedJson(request, 2_000));
  await reviewRate(env, [`customer-code-ip:${requestIP(request)}`], 30);
  const now = Math.floor(Date.now() / 1000);
  const attempt = await env.DB.prepare(
    `UPDATE customer_login_challenges SET attempts=attempts+1
     WHERE id=?1 AND email_normalized=?2 AND consumed_at IS NULL
       AND expires_at>?3 AND attempts<5
     RETURNING code_hash`,
  )
    .bind(data.challengeId, data.email, now)
    .first<{ code_hash: string }>();
  if (!attempt || !sameToken(attempt.code_hash, await digest(`${data.challengeId}:${data.code}`)))
    throw reviewFailure("Cod invalid sau expirat. Cere un cod nou.", 401);
  const consumed = await env.DB.prepare(
    `UPDATE customer_login_challenges SET consumed_at=?2
     WHERE id=?1 AND consumed_at IS NULL AND expires_at>?2
     RETURNING id`,
  )
    .bind(data.challengeId, now)
    .first<{ id: string }>();
  if (!consumed) throw reviewFailure("Codul a fost deja folosit.", 401);

  let account = await env.DB.prepare(
    "SELECT id,display_name AS displayName,email FROM review_accounts WHERE email=?1 AND status='active'",
  )
    .bind(data.email)
    .first<Reviewer>();
  if (!account) {
    const id = crypto.randomUUID();
    const displayName = safeDisplayName(null, data.email);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO review_accounts(
         id,email,display_name,password_hash,password_salt,status,auth_mode
       ) VALUES(?1,?2,?3,?4,?5,'active','password')`,
    )
      .bind(id, data.email, displayName, randomHex(), randomHex(16))
      .run();
    account = await env.DB.prepare(
      "SELECT id,display_name AS displayName,email FROM review_accounts WHERE email=?1 AND status='active'",
    )
      .bind(data.email)
      .first<Reviewer>();
  }
  if (!account) throw reviewFailure("Contul nu poate fi deschis acum.", 409);
  await ensureCommerceCustomer(env, account);
  return createReviewerSession(request, env, account, data.remember);
}

async function loginCustomerPassword(request: Request, env: Env) {
  const data = customerLoginSchema.parse(await boundedJson(request, 2_000));
  const email = data.identifier.toLowerCase();
  const phone = normalizeCustomerPhone(data.identifier);
  await reviewRate(
    env,
    [`customer-password-ip:${requestIP(request)}`, `customer-password-id:${email}`],
    6,
  );
  const account = await env.DB.prepare(
    `SELECT id,display_name AS displayName,email,password_hash AS passwordHash,password_salt AS passwordSalt
     FROM review_accounts WHERE (email=?1 OR phone_e164=?2) AND status='active' LIMIT 1`,
  )
    .bind(email, phone)
    .first<Reviewer & { passwordHash: string; passwordSalt: string }>();
  const valid = await verifyCustomerPassword(
    data.password,
    account?.passwordHash ?? "",
    account?.passwordSalt ?? "",
  );
  if (!account || !valid)
    throw reviewFailure(
      "Datele de conectare nu sunt corecte. Poți folosi codul primit pe e-mail pentru acces.",
      401,
    );
  await ensureCommerceCustomer(env, account);
  return createReviewerSession(request, env, account, data.remember);
}

async function setCustomerPassword(request: Request, env: Env) {
  const account = await currentReviewer(request, env);
  if (!account) throw reviewFailure("Conectează-te pentru a seta parola.", 401);
  const data = customerPasswordSetupSchema.parse(await boundedJson(request, 2_000));
  const phone = data.phone ? normalizeCustomerPhone(data.phone) : null;
  if (data.phone && !phone) throw reviewFailure("Numărul de telefon nu este valid.");
  await reviewRate(env, [`customer-password-setup:${account.id}`], 5);
  const { hash, salt } = await hashCustomerPassword(data.password);
  try {
    await env.DB.prepare(
      `UPDATE review_accounts SET password_hash=?2,password_salt=?3,phone_e164=COALESCE(?4,phone_e164)
       WHERE id=?1 AND status='active'`,
    )
      .bind(account.id, hash, salt, phone)
      .run();
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint/i.test(error.message))
      throw reviewFailure("Acest număr de telefon este deja asociat unui cont.", 409);
    throw error;
  }
  return reviewJson({ data: { saved: true } });
}

async function ensureCommerceCustomer(env: Env, account: Reviewer) {
  const now = new Date().toISOString();
  const normalizedEmail = account.email.trim().toLowerCase();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO customers(
         id,account_subject,email,email_normalized,full_name,customer_type,status,
         metadata_json,created_at,updated_at
       ) VALUES(?1,?2,?3,?4,?5,'registered','active',?6,?7,?7)`,
    ).bind(
      `customer-account-${account.id}`,
      account.id,
      account.email,
      normalizedEmail,
      account.displayName,
      JSON.stringify({ source: "customer_oauth" }),
      now,
    ),
    env.DB.prepare(
      `UPDATE review_accounts
       SET customer_id=COALESCE(
         customer_id,
         (SELECT id FROM customers WHERE account_subject=?1 LIMIT 1),
         (SELECT id FROM customers WHERE email_normalized=?2 LIMIT 1)
       )
       WHERE id=?1`,
    ).bind(account.id, normalizedEmail),
    env.DB.prepare(
      `UPDATE customers
       SET customer_type='registered', account_subject=COALESCE(account_subject, ?1),
           updated_at=?3
       WHERE email_normalized=?2 AND status='active'
         AND (account_subject IS NULL OR account_subject=?1)`,
    ).bind(account.id, normalizedEmail, now),
  ]);
}

async function startGoogleOAuth(request: Request, env: CustomerOAuthEnv) {
  const credentials = await googleOAuthCredentials(env);
  if (!credentials) return customerRedirect(request, "neconfigurat");
  await reviewRate(env, ["oauth-start:" + requestIP(request)], 20);
  const state = `${new URL(request.url).searchParams.get("remember") === "1" ? "r" : "s"}${randomHex()}`;
  const redirectUri = new URL("/api/v1/reviewer/oauth/google/callback", request.url).toString();
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
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
  const credentials = await googleOAuthCredentials(env);
  if (
    !credentials ||
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
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    redirect: "manual",
  });
  const tokenPayload = await readProviderJson(tokenResponse, 32_768);
  const tokenData = z
    .object({ access_token: z.string().min(16).max(8192), token_type: z.string() })
    .safeParse(tokenPayload);
  if (!tokenResponse.ok || !tokenData.success) return customerRedirect(request, "eroare");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokenData.data.access_token}` },
    redirect: "manual",
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
  await ensureCommerceCustomer(env, account);
  const response = await createReviewerSession(request, env, account, state.startsWith("r"));
  const headers = new Headers(response.headers);
  headers.append("set-cookie", oauthCookie(request, "", 0));
  headers.set("location", new URL("/cont", request.url).toString());
  return new Response(null, { status: 302, headers });
}

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

async function startAppleOAuth(request: Request, env: CustomerOAuthEnv) {
  const credentials = appleOAuthCredentials(env);
  if (!credentials || new URL(request.url).protocol !== "https:")
    return customerRedirect(request, "neconfigurat");
  await reviewRate(env, [`apple-oauth-start:${requestIP(request)}`], 20);
  const state = `${new URL(request.url).searchParams.get("remember") === "1" ? "r" : "s"}${randomHex()}`;
  const redirectUri = new URL("/api/v1/reviewer/oauth/apple/callback", request.url).toString();
  const authorization = new URL("https://appleid.apple.com/auth/authorize");
  authorization.search = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state,
    nonce: state,
  }).toString();
  return new Response(null, {
    status: 302,
    headers: { location: authorization.toString(), "set-cookie": appleOauthCookie(state) },
  });
}

async function finishAppleOAuth(request: Request, env: CustomerOAuthEnv) {
  const credentials = appleOAuthCredentials(env);
  if (!credentials) return customerRedirect(request, "neconfigurat");
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return customerRedirect(request, "eroare");
  const form = await request.formData();
  const state = String(form.get("state") ?? "");
  const code = String(form.get("code") ?? "");
  const expected = requestCookie(request, appleStateCookie) ?? "";
  if (
    !state ||
    !expected ||
    !sameToken(state, expected) ||
    !code ||
    code.length > 4096 ||
    form.has("error")
  )
    return customerRedirect(request, "eroare");
  const key = await importPKCS8(credentials.privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);
  const clientSecret = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: credentials.keyId })
    .setIssuer(credentials.teamId)
    .setSubject(credentials.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
  const redirectUri = new URL("/api/v1/reviewer/oauth/apple/callback", request.url).toString();
  const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    redirect: "manual",
  });
  const tokenPayload = await readProviderJson(tokenResponse, 32_768);
  const token = z.object({ id_token: z.string().min(50).max(8192) }).safeParse(tokenPayload);
  if (!tokenResponse.ok || !token.success) return customerRedirect(request, "eroare");
  const verified = await jwtVerify(token.data.id_token, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: credentials.clientId,
    algorithms: ["RS256"],
  });
  if (verified.payload.nonce !== state) return customerRedirect(request, "eroare");
  const subject = verified.payload.sub;
  const email =
    typeof verified.payload.email === "string" ? verified.payload.email.toLowerCase() : null;
  const emailVerified =
    verified.payload.email_verified === true || verified.payload.email_verified === "true";
  if (!subject || !emailVerified || !email || !z.string().email().safeParse(email).success)
    return customerRedirect(request, "eroare");
  let account = await env.DB.prepare(
    `SELECT a.id,a.display_name AS displayName,a.email FROM review_apple_identities ai
     JOIN review_accounts a ON a.id=ai.account_id
     WHERE ai.provider_subject=?1 AND a.status='active'`,
  )
    .bind(subject)
    .first<Reviewer>();
  if (!account) {
    const existing = await env.DB.prepare(
      "SELECT id,display_name AS displayName,email FROM review_accounts WHERE email=?1 AND status='active'",
    )
      .bind(email)
      .first<Reviewer>();
    const id = existing?.id ?? crypto.randomUUID();
    const displayName = safeDisplayName(null, email);
    await env.DB.batch([
      ...(existing
        ? []
        : [
            env.DB.prepare(
              `INSERT INTO review_accounts(id,email,display_name,password_hash,password_salt,status,auth_mode)
         VALUES(?1,?2,?3,?4,?5,'active','oauth')`,
            ).bind(id, email, displayName, randomHex(), randomHex(16)),
          ]),
      env.DB.prepare(
        "INSERT INTO review_apple_identities(provider_subject,account_id,email_at_link) VALUES(?1,?2,?3)",
      ).bind(subject, id, email),
    ]);
    account = existing ?? { id, email, displayName };
  }
  await ensureCommerceCustomer(env, account);
  const response = await createReviewerSession(request, env, account, state.startsWith("r"));
  const headers = new Headers(response.headers);
  headers.append("set-cookie", appleOauthCookie("", 0));
  headers.set("location", new URL("/cont", request.url).toString());
  return new Response(null, { status: 303, headers });
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
      return reviewJson({
        data: {
          google: { enabled: Boolean(await googleOAuthCredentials(customerEnv)) },
          apple: { enabled: Boolean(appleOAuthCredentials(customerEnv)) },
          email: { enabled: await hasEmailTransport(env) },
        },
      });
    if (path === "/api/v1/reviewer/oauth/google" && request.method === "GET")
      return startGoogleOAuth(request, customerEnv);
    if (path === "/api/v1/reviewer/oauth/google/callback" && request.method === "GET")
      return finishGoogleOAuth(request, customerEnv);
    if (path === "/api/v1/reviewer/oauth/apple" && request.method === "GET")
      return startAppleOAuth(request, customerEnv);
    if (path === "/api/v1/reviewer/oauth/apple/callback" && request.method === "POST")
      return finishAppleOAuth(request, customerEnv);
    if (path === "/api/v1/reviewer" && request.method === "GET")
      return reviewJson({ data: await currentReviewer(request, env) });
    if (request.method !== "POST") throw reviewFailure("Metodă nepermisă.", 405);
    sameOrigin(request);
    if (path === "/api/v1/reviewer/email/start") return await startCustomerEmailLogin(request, env);
    if (path === "/api/v1/reviewer/email/verify")
      return await verifyCustomerEmailLogin(request, env);
    if (path === "/api/v1/reviewer/login") return await loginCustomerPassword(request, env);
    if (path === "/api/v1/reviewer/password") return await setCustomerPassword(request, env);
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
    if (path === "/api/v1/reviewer/register")
      throw reviewFailure("Creează contul prin verificarea adresei de e-mail.", 410);
    throw reviewFailure("Pagina nu există.", 404);
  } catch (error) {
    if (
      path === "/api/v1/reviewer/oauth/google/callback" ||
      path === "/api/v1/reviewer/oauth/apple/callback"
    ) {
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
