import { handleReviews } from "./reviews";
import { handleReviewAccount } from "../review-accounts";
import { localMediaPreview } from "@/server/media-policy";
import { handleCheckoutAdmin } from "./checkout-admin";
import { handleStoryScene } from "./story-scene";
import { handleShippingCheckout } from "./shipping-checkout";
import { handlePayments } from "./payments";
import { checkoutReadiness } from "../services/checkout-readiness";
import { boundedJson } from "./bounded-json";
import { handleSalesWorkbench } from "./sales-workbench";
import { handleStorefrontDesign } from "./storefront-design";
import { handleAdminInventory } from "./admin-inventory";
import { handleProductInterest } from "./product-interest";
import { listPublicCatalog } from "@/server/db/catalog.repository";
import { websiteOrderInputSchema } from "@/lib/order-contracts";
import {
  CheckoutError,
  createWebsiteOrder,
  markOrderNotificationQueued,
} from "@/server/db/order.repository";
import { handleAdminMediaApi } from "@/server/api/admin-media";
import { handleAdminProductExperienceApi } from "@/server/api/admin-product-experience";
import { handleAdminProductApi } from "@/server/api/admin-product";
import { handleAdminAvyronSyncApi } from "@/server/api/admin-avyron-sync";
import { getPublicProductExperience } from "@/server/api/product-experience";
import { handleCommerceApi } from "@/server/api/commerce";
import { handleChatApi } from "@/server/api/chat";
import { sendOrderConfirmation } from "@/server/integrations/resend";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";
import { credentialStatuses } from "@/server/services/growth-settings";

const API_PREFIX = "/api/v1/";

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function methodNotAllowed(allow: string): Response {
  return json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Metoda nu este permisa." } },
    { status: 405, headers: { allow } },
  );
}

async function createOrder(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json(
      { error: { code: "ORIGIN_NOT_ALLOWED", message: "Originea cererii nu este permisă." } },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_768) {
    return json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Cererea este prea mare." } },
      { status: 413 },
    );
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Conținutul trebuie trimis ca JSON." } },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await boundedJson(request, 32_768);
  } catch {
    return json(
      { error: { code: "INVALID_JSON", message: "Cererea JSON nu este validă." } },
      { status: 400 },
    );
  }

  const parsed = websiteOrderInputSchema.safeParse(body);
  if (!parsed.success || parsed.data.website) {
    return json(
      {
        error: { code: "INVALID_ORDER", message: "Verifică datele comenzii și încearcă din nou." },
      },
      { status: 400 },
    );
  }

  try {
    const result = await createWebsiteOrder(env.DB, parsed.data, async () => {
      if (parsed.data.paymentMethod === "bank_transfer")
        throw new CheckoutError("Alege o metodă de plată disponibilă.", 409);
      if (parsed.data.paymentMethod === "card") {
        const ready = await checkoutReadiness(env as CommerceEnv);
        if (!ready.options.some((o) => o.id === (parsed.data.paymentProvider ?? "stripe")))
          throw new CheckoutError(
            "Metoda de plată nu mai este disponibilă. Alege o altă opțiune.",
            409,
          );
      }
    });
    if (result.outboxId) {
      try {
        await env.COMMERCE_EVENTS.send({ version: 1, outboxId: result.outboxId });
        await markOrderNotificationQueued(env.DB, result.outboxId);
      } catch (error) {
        console.warn("order.notification_queue_failed", {
          orderId: result.orderId,
          outboxId: result.outboxId,
          error,
        });
      }
    }
    const commerceEnv = env as CommerceEnv;
    if (
      (await credentialStatuses(commerceEnv)).some((c) => c.provider === "resend" && c.configured)
    ) {
      ctx.waitUntil(
        sendOrderConfirmation(commerceEnv, result.orderId).catch((error) =>
          console.error("order.customer_email_failed", { orderId: result.orderId, error }),
        ),
      );
    }

    const { outboxId: _outboxId, replayed: _replayed, ...publicResult } = result;
    return json({ data: publicResult }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return json(
        { error: { code: "ORDER_REJECTED", message: error.message } },
        { status: error.status },
      );
    }
    console.error("api.order_create_failed", error);
    return json(
      { error: { code: "ORDER_CREATE_FAILED", message: "Comanda nu a putut fi înregistrată." } },
      { status: 500 },
    );
  }
}

export async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API_PREFIX)) return null;

  const reviewAccountResponse = await handleReviewAccount(request, env);
  if (reviewAccountResponse) return reviewAccountResponse;
  const reviewsResponse = await handleReviews(request, env);
  if (reviewsResponse) return reviewsResponse;

  const storyResponse = await handleStoryScene(request, env);
  if (storyResponse) return storyResponse;

  const checkoutAdminResponse = await handleCheckoutAdmin(request, env as CommerceEnv);
  if (checkoutAdminResponse) return checkoutAdminResponse;
  const salesResponse = await handleSalesWorkbench(request, env);
  if (salesResponse) return salesResponse;
  const designResponse = await handleStorefrontDesign(request, env);
  if (designResponse) return designResponse;
  const inventoryResponse = await handleAdminInventory(request, env);
  if (inventoryResponse) return inventoryResponse;
  const interestResponse = await handleProductInterest(request, env);
  if (interestResponse) return interestResponse;

  const adminMediaResponse = await handleAdminMediaApi(request, env);
  if (adminMediaResponse) return adminMediaResponse;

  const adminExperienceResponse = await handleAdminProductExperienceApi(request, env);
  if (adminExperienceResponse) return adminExperienceResponse;

  const adminProductResponse = await handleAdminProductApi(request, env);
  if (adminProductResponse) return adminProductResponse;

  const adminAvyronResponse = await handleAdminAvyronSyncApi(request, env);
  if (adminAvyronResponse) return adminAvyronResponse;

  const shippingResponse = await handleShippingCheckout(request, env as CommerceEnv);
  if (shippingResponse) return shippingResponse;
  const paymentResponse = await handlePayments(request, env as CommerceEnv);
  if (paymentResponse) return paymentResponse;

  const commerceResponse = await handleCommerceApi(request, env as CommerceEnv, ctx);
  if (commerceResponse) return commerceResponse;

  const chatResponse = await handleChatApi(request, env);
  if (chatResponse) return chatResponse;

  if (url.pathname === "/api/v1/orders") {
    if (request.method !== "POST") return methodNotAllowed("POST");
    return createOrder(request, env, ctx);
  }

  if (request.method !== "GET") return methodNotAllowed("GET");

  if (url.pathname === "/api/v1/health") {
    const schemaVersion = await env.DB.prepare(
      "SELECT value FROM schema_metadata WHERE key = 'schema_version'",
    ).first<string>("value");

    return json(
      {
        status: schemaVersion ? "ok" : "degraded",
        environment: env.APP_ENV,
        schemaVersion,
        timestamp: new Date().toISOString(),
      },
      { status: schemaVersion ? 200 : 503 },
    );
  }

  if (url.pathname === "/api/v1/catalog/products") {
    const products = await listPublicCatalog(env.DB, localMediaPreview(env));
    return json({ data: products, meta: { count: products.length, productType: "music_box" } });
  }

  const experienceMatch = url.pathname.match(
    /^\/api\/v1\/catalog\/products\/([a-zA-Z0-9-]+)\/experience$/,
  );
  if (experienceMatch) {
    return getPublicProductExperience(env, experienceMatch[1]);
  }

  return json({ error: { code: "NOT_FOUND", message: "Resursa API nu exista." } }, { status: 404 });
}
