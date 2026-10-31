import { z } from "zod";
import { GROWTH_EVENT_NAMES, type GrowthEventName } from "@/lib/growth-events";
import { boundedJson } from "./bounded-json";

const PATH = "/api/v1/growth/events";
const propertyValue = z.union([z.string().max(160), z.number().finite(), z.boolean()]);
const eventSchema = z.object({
  name: z.enum(GROWTH_EVENT_NAMES),
  sessionId: z.string().uuid(),
  productSlug: z.string().trim().max(120).optional(),
  path: z.string().trim().startsWith("/").max(300),
  value: z.number().finite().min(0).max(10_000_000).optional(),
  quantity: z.number().int().min(0).max(100).optional(),
  properties: z
    .record(z.string().max(40), propertyValue)
    .refine((value) => Object.keys(value).length <= 8)
    .optional(),
});

type RecordedGrowthEvent = z.infer<typeof eventSchema>;

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function recordGrowthEvent(
  env: Env,
  ctx: ExecutionContext,
  event: Omit<RecordedGrowthEvent, "sessionId"> & { sessionId: string },
): void {
  ctx.waitUntil(
    (async () => {
      const sessionHash = await shortHash(`${env.APP_ENV}:${event.sessionId}`);
      const productSlug = event.productSlug ?? "";
      const properties = JSON.stringify(event.properties ?? {});
      try {
        env.ANALYTICS.writeDataPoint({
          indexes: [event.name],
          blobs: [env.APP_ENV, sessionHash, productSlug, event.path, properties],
          doubles: [event.value ?? 0, event.quantity ?? 0],
        });
      } catch (error) {
        console.warn("growth.analytics_write_failed", { name: event.name, error });
      }
      await env.DB.prepare(
        `INSERT INTO growth_event_daily(event_day,event_name,product_slug,path,event_count,value_total,quantity_total)
         VALUES(date('now'),?1,?2,?3,1,?4,?5)
         ON CONFLICT(event_day,event_name,product_slug,path) DO UPDATE SET
           event_count=event_count+1,
           value_total=value_total+excluded.value_total,
           quantity_total=quantity_total+excluded.quantity_total,
           updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      )
        .bind(event.name, productSlug, event.path, event.value ?? 0, event.quantity ?? 0)
        .run();
    })().catch((error) => console.warn("growth.rollup_write_failed", { name: event.name, error })),
  );
}

export function recordPurchaseGrowthEvent(
  env: Env,
  ctx: ExecutionContext,
  input: { orderId: string; total: number; quantity: number; shippingOption: string },
): void {
  recordGrowthEvent(env, ctx, {
    name: "purchase",
    sessionId: input.orderId,
    path: "/comanda",
    value: input.total,
    quantity: input.quantity,
    properties: { shippingOption: input.shippingOption, source: "confirmed_order" },
  });
}

export async function handleGrowthEvents(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== PATH) return null;
  if (request.method !== "POST")
    return Response.json({ error: { message: "Metodă nepermisă." } }, { status: 405 });
  if (request.headers.get("origin") !== url.origin)
    return Response.json({ error: { message: "Origine nepermisă." } }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 8_192)
    return Response.json({ error: { message: "Eveniment prea mare." } }, { status: 413 });
  try {
    const parsed = eventSchema.safeParse(await boundedJson(request, 8_192));
    if (!parsed.success)
      return Response.json({ error: { message: "Eveniment invalid." } }, { status: 400 });
    recordGrowthEvent(env, ctx, parsed.data);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Eveniment invalid." } }, { status: 400 });
  }
}
