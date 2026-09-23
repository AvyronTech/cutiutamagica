import { scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { boundedJson } from "./api/bounded-json";
import type { Reviewer } from "@/lib/reviews";
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
function hashPassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, value) => (error ? reject(error) : resolve(value)),
    ),
  );
}
const cookieName = "cm_reviewer";
function token(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function cookie(request: Request, value: string, seconds = 604800) {
  return `${cookieName}=${value}; Path=/api/v1/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
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
const accountInput = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(60).optional(),
  website: z.string().max(0).default(""),
  consent: z.boolean().optional(),
});
export async function handleReviewAccount(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/api/v1/reviewer")) return null;
  try {
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
    if (!["/api/v1/reviewer/login", "/api/v1/reviewer/register"].includes(path))
      throw reviewFailure("Pagina nu există.", 404);
    const parsed = accountInput.safeParse(await boundedJson(request, 4096));
    if (!parsed.success) throw reviewFailure("Verifică e-mailul și parola (minimum 12 caractere).");
    const input = parsed.data,
      register = path.endsWith("/register");
    if (register && (!input.displayName || !input.consent))
      throw reviewFailure("Completează numele și acordul pentru cont.");
    await reviewRate(env, ["auth-ip:" + requestIP(request), "auth-email:" + input.email], 8);
    const row = await env.DB.prepare("SELECT * FROM review_accounts WHERE email=?1")
      .bind(input.email)
      .first<{
        id: string;
        display_name: string;
        password_salt: string;
        password_hash: string;
        status: string;
      }>();
    let id = row?.id,
      displayName = row?.display_name;
    if (register) {
      if (row)
        throw reviewFailure(
          "Contul nu poate fi creat cu aceste date. Încearcă autentificarea.",
          409,
        );
      const salt = crypto.randomUUID();
      const hash = (await hashPassword(input.password, salt)).toString("hex");
      id = crypto.randomUUID();
      displayName = input.displayName!;
      await env.DB.prepare(
        "INSERT INTO review_accounts(id,email,display_name,password_hash,password_salt) VALUES(?1,?2,?3,?4,?5)",
      )
        .bind(id, input.email, displayName, hash, salt)
        .run();
    } else {
      const hash = await hashPassword(input.password, row?.password_salt || "review-dummy-salt");
      if (
        !row ||
        row.status !== "active" ||
        !timingSafeEqual(hash, Buffer.from(row.password_hash, "hex"))
      )
        throw reviewFailure("E-mail sau parolă incorectă.", 401);
    }
    const bytes = crypto.getRandomValues(new Uint8Array(32)),
      value = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM review_sessions WHERE expires_at<?1").bind(
        Math.floor(Date.now() / 1000),
      ),
      env.DB.prepare(
        "INSERT INTO review_sessions(token_hash,account_id,expires_at) VALUES(?1,?2,?3)",
      ).bind(await digest(value), id!, Math.floor(Date.now() / 1000) + 604800),
    ]);
    return reviewJson({ data: { id, displayName, email: input.email } }, register ? 201 : 200, {
      "set-cookie": cookie(request, value),
    });
  } catch (error) {
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
