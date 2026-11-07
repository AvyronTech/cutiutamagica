import { z } from "zod";
import { MAX_CART_QUANTITY, MAX_ITEM_QUANTITY } from "@/lib/pricing";
import { boundedJson } from "./bounded-json";
import { checkoutSubtotal } from "../db/order.repository";
import { evaluateCheckoutCode, PromotionCodeError } from "../services/referrals";
import { digestHex, type CommerceEnv } from "../integrations/provider-runtime";

const validationInput = z
  .object({
    code: z.string().trim().min(4).max(40),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]).default(""),
    phone: z.string().trim().max(30).default(""),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1).max(120),
          quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
        }),
      )
      .min(1)
      .max(40),
  })
  .superRefine((value, context) => {
    if (value.items.reduce((sum, item) => sum + item.quantity, 0) > MAX_CART_QUANTITY) {
      context.addIssue({ code: "custom", message: "Cantitatea din coș este prea mare." });
    }
  });

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
  });
}

export async function handlePromotionCodes(
  request: Request,
  env: CommerceEnv,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== "/api/v1/promotions/validate") return null;
  if (request.method !== "POST") return json({ error: { message: "Cerere nepermisă." } }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: { message: "Cerere nepermisă." } }, 403);

  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const bucket = new Date().toISOString().slice(0, 13);
  const rateKey = `rate:promotion:${await digestHex("SHA-256", ip)}:${bucket}`;
  const count = Number((await env.CACHE.get(rateKey)) ?? 0);
  if (count >= 30)
    return json(
      { error: { message: "Ai verificat prea multe coduri. Încearcă din nou mai târziu." } },
      429,
    );
  await env.CACHE.put(rateKey, String(count + 1), { expirationTtl: 3_900 });

  try {
    const input = validationInput.parse(await boundedJson(request, 16_384));
    const subtotalBani = await checkoutSubtotal(env.DB, input.items);
    const evaluation = await evaluateCheckoutCode(env.DB, input.code, subtotalBani, {
      email: input.email,
      phone: input.phone,
    });
    if (!evaluation) throw new PromotionCodeError("Codul nu este valid.", "CODE_INVALID");
    return json({
      data: {
        code: evaluation.code,
        label: evaluation.label,
        discount: evaluation.discountBani / 100,
      },
    });
  } catch (error) {
    if (error instanceof PromotionCodeError) {
      return json({ error: { code: error.code, message: error.message } }, 409);
    }
    if (error instanceof z.ZodError) {
      return json({ error: { code: "INVALID_INPUT", message: "Verifică datele codului." } }, 400);
    }
    console.error("promotion.validate_failed", error);
    return json(
      {
        error: { code: "PROMOTION_UNAVAILABLE", message: "Codul nu poate fi verificat momentan." },
      },
      500,
    );
  }
}
