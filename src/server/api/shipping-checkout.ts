import { websiteOrderInputSchema } from "@/lib/order-contracts";
import { boundedJson } from "./bounded-json";
import { checkoutSubtotal } from "../db/order.repository";
import { credential } from "../services/growth-settings";
import { shippingFingerprint } from "../services/shipping-fingerprint";
import { digestHex, ProviderError, type CommerceEnv } from "../integrations/provider-runtime";
import { quoteSmartShip, resolveSmartShipCity } from "../integrations/smartship";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function handleShippingCheckout(
  request: Request,
  env: CommerceEnv,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== "/api/v1/shipping/quotes") return null;
  if (request.method !== "POST") return json({ error: { message: "Cerere nepermisă." } }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: { message: "Cerere nepermisă." } }, 403);
  try {
    const raw = (await boundedJson(request, 16384)) as Record<string, unknown>;
    const input = websiteOrderInputSchema.safeParse({
      ...raw,
      idempotencyKey: crypto.randomUUID(),
      checkoutConsentAccepted: true,
      checkoutConsentVersion: "quote",
    });
    if (!input.success || input.data.shippingOption !== "home_delivery")
      return json(
        {
          error: { message: "Completează datele de contact și adresa pentru a calcula livrarea." },
        },
        400,
      );
    const policy = await env.DB.prepare(
      "SELECT * FROM shipping_policy_configs WHERE code='RO_STANDARD'",
    ).first<Record<string, string | number | null>>();
    if (
      !policy ||
      policy.validation_status !== "verified" ||
      policy.use_live_quotes !== 1 ||
      !(await credential(env, "smartship"))
    )
      return json({ error: { message: "Estimarea livrării nu este disponibilă momentan." } }, 409);
    if (
      !policy.sender_name ||
      !policy.sender_address ||
      !policy.sender_phone ||
      !policy.sender_city_id ||
      Number(policy.default_weight_g) <= 0 ||
      Number(policy.default_length_cm) <= 0 ||
      Number(policy.default_width_cm) <= 0 ||
      Number(policy.default_height_cm) <= 0
    )
      throw new Error("SENDER_INCOMPLETE");
    const rateKey = `shipping:rate:${await digestHex("SHA-256", request.headers.get("cf-connecting-ip") ?? "local")}:${new Date().toISOString().slice(0, 16)}`;
    const count = Number((await env.CACHE.get(rateKey)) ?? 0);
    if (count >= 6)
      return json(
        { error: { message: "Te rugăm să aștepți un minut înainte de o nouă estimare." } },
        429,
      );
    await env.CACHE.put(rateKey, String(count + 1), { expirationTtl: 120 });
    const total = await checkoutSubtotal(env.DB, input.data.items);
    const customer = input.data.customer;
    const cityId = await resolveSmartShipCity(env, customer.county, customer.city);
    const qty = input.data.items.reduce((sum, item) => sum + item.quantity, 0);
    const quotes = await quoteSmartShip(env, {
      sender: {
        name: String(policy.sender_name),
        address: String(policy.sender_address),
        email: String(policy.sender_email || ""),
        phone: String(policy.sender_phone),
        cityId: Number(policy.sender_city_id),
        country: "RO",
        sector: Number(policy.sender_sector || 0),
      },
      recipient: {
        name: customer.name,
        address: customer.address,
        email: customer.email,
        phone: customer.phone,
        cityId,
        country: "RO",
        sector: /^0[1-6]\d{4}$/.test(customer.postalCode) ? Number(customer.postalCode[1]) : 0,
      },
      content: {
        packageContent: "Cutiuțe muzicale",
        parcels: 1,
        weightKg: (Number(policy.default_weight_g) * qty) / 1000,
        lengthCm: Number(policy.default_length_cm),
        widthCm: Number(policy.default_width_cm),
        heightCm: Number(policy.default_height_cm) * qty,
        cashOnDeliveryRon: input.data.paymentMethod === "cash_on_delivery" ? total / 100 : 0,
      },
    });
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const hash = await shippingFingerprint(input.data, total);
    const free = policy.free_over_bani != null && total >= Number(policy.free_over_bani);
    const offers = quotes.slice(0, 15).map((q) => ({
      id: crypto.randomUUID(),
      courier: q.courierName,
      price: free ? 0 : Math.round(q.costRon * 100) / 100,
      estimate: q.deliveryDate,
      expiresAt,
      courierId: q.courierId,
      ownContract: q.ownContract,
    }));
    if (!offers.length)
      return json(
        {
          error: {
            message:
              "Nu avem o ofertă de curierat pentru această adresă. Verifică datele sau contactează-ne.",
          },
        },
        409,
      );
    await env.DB.batch(
      offers.map((o) =>
        env.DB.prepare(
          `INSERT INTO shipping_quotes(id,provider,method_code,courier_id,courier_name,amount_bani,currency,own_contract,request_hash,expires_at,delivery_estimate) VALUES(?1,'smartship','home_delivery',?2,?3,?4,'RON',?5,?6,?7,?8)`,
        ).bind(
          o.id,
          o.courierId,
          o.courier,
          Math.round(o.price * 100),
          o.ownContract ? 1 : 0,
          hash,
          expiresAt,
          o.estimate,
        ),
      ),
    );
    return json({ data: offers.map(({ courierId: _id, ownContract: _own, ...offer }) => offer) });
  } catch (error) {
    const safe = error instanceof ProviderError && error.code === "LOCATION_INVALID";
    console.error("shipping.quote_failed", {
      code: error instanceof ProviderError ? error.code : "QUOTE_FAILED",
    });
    return json(
      {
        error: {
          message: safe
            ? (error as Error).message
            : "Nu am putut calcula livrarea acum. Poți încerca din nou sau folosi opțiunea de livrare afișată.",
        },
      },
      safe ? 400 : 503,
    );
  }
}
