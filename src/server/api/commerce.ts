import { checkoutReadiness } from "../services/checkout-readiness";
import { boundedJson } from "./bounded-json";
import { returnRequestInputSchema } from "@/lib/commerce-operations-contracts";
import {
  createReturnRequest,
  getCommercePublicConfig,
} from "@/server/db/commerce-operations.repository";
import { sendReturnAcknowledgement } from "@/server/integrations/resend";
import { digestHex, ProviderError, type CommerceEnv } from "@/server/integrations/provider-runtime";
import { credentialStatuses } from "@/server/services/growth-settings";

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

async function readJson(request: Request, maxBytes = 32_768): Promise<unknown> {
  return boundedJson(request, maxBytes);
}

async function enforceReturnRateLimit(request: Request, env: CommerceEnv): Promise<void> {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const bucket = new Date().toISOString().slice(0, 13);
  const key = `rate:return:${await digestHex("SHA-256", ip)}:${bucket}`;
  const count = Number((await env.CACHE.get(key)) ?? 0);
  if (count >= 5) {
    throw new ProviderError(
      "Ai trimis prea multe cereri. Încearcă din nou mai târziu.",
      "RATE_LIMITED",
      429,
    );
  }
  await env.CACHE.put(key, String(count + 1), { expirationTtl: 3_900 });
}

async function handleCreateReturn(
  request: Request,
  env: CommerceEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  await enforceReturnRateLimit(request, env);
  const parsed = returnRequestInputSchema.safeParse(await readJson(request));
  if (!parsed.success || parsed.data.website) {
    return json(
      { error: { code: "INVALID_RETURN_REQUEST", issues: parsed.error?.flatten() } },
      { status: 400 },
    );
  }
  const result = await createReturnRequest(env.DB, parsed.data);
  if ((await credentialStatuses(env)).some((c) => c.provider === "resend" && c.configured)) {
    ctx.waitUntil(
      sendReturnAcknowledgement(env, {
        returnId: result.returnId,
        returnNumber: result.returnNumber,
        customerName: parsed.data.customerName,
        email: parsed.data.email,
      }).catch((error) =>
        console.error("return.email_failed", { returnId: result.returnId, error }),
      ),
    );
  }
  const { returnId: _returnId, ...publicResult } = result;
  return json({ data: publicResult }, { status: 201 });
}

export async function handleCommerceApi(
  request: Request,
  env: CommerceEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  try {
    if (path === "/api/v1/commerce/config") {
      if (request.method !== "GET")
        return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      const configured = await credentialStatuses(env);
      const config = await getCommercePublicConfig(env.DB, {
        stripe: Boolean(
          configured.some((c) => c.provider === "stripe" && c.configured) &&
          configured.some((c) => c.provider === "stripe_webhook" && c.configured),
        ),
        smartship: configured.some((c) => c.provider === "smartship" && c.configured),
      });
      const ready = await checkoutReadiness(env);
      config.payments.options = ready.options;
      config.payments.card.enabled = ready.options.some((o) => o.id === "stripe");
      // Locker checkout remains hidden until an actual locker can be selected.
      config.shipping.easyboxEnabled = false;
      return json({ data: config });
    }
    if (path === "/api/v1/returns") {
      if (request.method !== "POST")
        return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      return await handleCreateReturn(request, env, ctx);
    }
    return null;
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 500;
    const code = error instanceof ProviderError ? error.code : "COMMERCE_OPERATION_FAILED";
    console.error("commerce.api_failed", { path, error });
    return json(
      {
        error: {
          code,
          message:
            status < 500 && error instanceof ProviderError
              ? error.message
              : "Serviciul nu este disponibil momentan. Încearcă din nou.",
        },
      },
      { status },
    );
  }
}
