import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
export const interestSchema = z.object({
  productSlug: z.string().regex(/^[a-z0-9-]{1,128}$/),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  kind: z.enum(["notify", "preorder"]),
  website: z.string().max(0).optional(),
});
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function handleProductInterest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url),
    adminMatch = url.pathname.match(/^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/interest$/);
  if (adminMatch) {
    try {
      const admin = await authenticateAdminRequest(
        request,
        env,
        request.method === "GET" ? "catalog.read" : "catalog.write",
      );
      if (request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT id,email,kind,status,created_at FROM product_interest WHERE product_id=?1 ORDER BY created_at DESC LIMIT 200",
        )
          .bind(adminMatch[1])
          .all();
        return json({ data: rows.results });
      }
      if (request.method !== "PATCH") return json({ error: { message: "Metodă nepermisă." } }, 405);
      if (request.headers.get("origin") && request.headers.get("origin") !== url.origin)
        return json({ error: { message: "Origine invalidă." } }, 403);
      const body = z
        .object({ id: z.string().uuid(), status: z.enum(["new", "contacted", "closed"]) })
        .safeParse(await request.json().catch(() => null));
      if (!body.success) return json({ error: { message: "Date invalide." } }, 400);
      const result = await env.DB.prepare(
        "UPDATE product_interest SET status=?1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND product_id=?3",
      )
        .bind(body.data.status, body.data.id, adminMatch[1])
        .run();
      if (result.meta.changes)
        await env.DB.prepare(
          "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) VALUES(?1,?2,?3,'product_interest.update','product_interest',?4,?5,'{}')",
        )
          .bind(
            crypto.randomUUID(),
            admin.id,
            admin.email,
            body.data.id,
            JSON.stringify({ status: body.data.status }),
          )
          .run();
      return result.meta.changes
        ? json({ data: { saved: true } })
        : json({ error: { message: "Solicitarea nu există." } }, 404);
    } catch (e) {
      const status = e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : 500;
      return json({ error: { message: "Nu poți accesa solicitările." } }, status);
    }
  }
  if (url.pathname !== "/api/v1/product-interest") return null;
  if (request.method !== "POST") return json({ error: { message: "Metodă nepermisă." } }, 405);
  if (request.headers.get("origin") && request.headers.get("origin") !== url.origin)
    return json({ error: { message: "Origine invalidă." } }, 403);
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return json({ error: { message: "Cerere prea mare." } }, 413);
  const reader = request.body?.getReader();
  let raw = "",
    received = 0;
  const decoder = new TextDecoder();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > 4096) {
          void reader.cancel().catch(() => undefined);
          return json({ error: { message: "Cerere prea mare." } }, 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return json({ error: { message: "Date invalide." } }, 400);
  }
  const parsed = interestSchema.safeParse(input);
  if (!parsed.success) return json({ error: { message: "Verifică adresa de e-mail." } }, 400);
  const { productSlug, email, kind } = parsed.data;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(request.headers.get("cf-connecting-ip") || "local"),
  );
  const key =
    "interest-rate:" +
    Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("") +
    ":" +
    Math.floor(Date.now() / 900000);
  const count = Number((await env.CACHE.get(key)) || 0);
  if (count >= 10)
    return json(
      { error: { message: "Ai trimis mai multe solicitări. Încearcă puțin mai târziu." } },
      429,
    );
  await env.CACHE.put(key, String(count + 1), { expirationTtl: 900 });
  const product = await env.DB.prepare(
    "SELECT id,preorder_enabled,storefront_state FROM products WHERE slug=?1 AND status='active' AND published_at IS NOT NULL",
  )
    .bind(productSlug)
    .first<{ id: string; preorder_enabled: number; storefront_state: string }>();
  if (!product || (kind === "preorder" && !product.preorder_enabled))
    return json({ error: { message: "Această opțiune nu este disponibilă pentru produs." } }, 409);
  await env.DB.prepare(
    "INSERT INTO product_interest(id,product_id,email,kind) VALUES(?1,?2,?3,?4) ON CONFLICT(product_id,email,kind) DO NOTHING",
  )
    .bind(crypto.randomUUID(), product.id, email, kind)
    .run();
  return json({ data: { registered: true } }, 201);
}
