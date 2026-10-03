import { websiteOrderInputSchema } from "@/lib/order-contracts";
import { boundedJson } from "./bounded-json";
import { checkoutSubtotal } from "../db/order.repository";
import { credential } from "../services/growth-settings";
import { shippingFingerprint } from "../services/shipping-fingerprint";
import { digestHex, ProviderError, type CommerceEnv } from "../integrations/provider-runtime";
import {
  listSmartShipEasyboxes,
  quoteSmartShip,
  resolveSmartShipCity,
} from "../integrations/smartship";
import type { EasyboxLocker } from "@/lib/easybox";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });

function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function lockerScore(locker: EasyboxLocker, query: string): number {
  const city = searchKey(locker.city);
  const county = searchKey(locker.county);
  const name = searchKey(locker.name);
  const address = searchKey(locker.address);
  if (city === query) return 0;
  if (city.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (`${city} ${county}`.includes(query)) return 3;
  if (`${name} ${address} ${city} ${county}`.includes(query)) return 4;
  return 99;
}

async function handleEasyboxList(request: Request, env: CommerceEnv): Promise<Response> {
  if (request.method !== "GET") return json({ error: { message: "Cerere nepermisă." } }, 405);
  const url = new URL(request.url);
  const query = searchKey(url.searchParams.get("q") ?? "");
  if (query.length < 2)
    return json({ error: { message: "Scrie localitatea sau adresa dorită." } }, 400);
  const policy = await env.DB.prepare(
    "SELECT easybox_enabled, validation_status FROM shipping_policy_configs WHERE code='RO_STANDARD'",
  ).first<Record<string, string | number | null>>();
  if (
    !policy ||
    policy.validation_status !== "verified" ||
    Number(policy.easybox_enabled) !== 1 ||
    !(await credential(env, "smartship"))
  )
    return json({ error: { message: "Livrarea Easybox nu este activă momentan." } }, 409);

  const rateKey = `easybox:rate:${await digestHex("SHA-256", request.headers.get("cf-connecting-ip") ?? "local")}:${new Date().toISOString().slice(0, 16)}`;
  const count = Number((await env.CACHE.get(rateKey)) ?? 0);
  if (count >= 30)
    return json(
      { error: { message: "Te rugăm să aștepți puțin înainte de o nouă căutare." } },
      429,
    );
  await env.CACHE.put(rateKey, String(count + 1), { expirationTtl: 120 });

  const lockers = (await listSmartShipEasyboxes(env))
    .map((locker) => ({ locker, score: lockerScore(locker, query) }))
    .filter(({ score }) => score < 99)
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.locker.city.localeCompare(right.locker.city, "ro") ||
        left.locker.name.localeCompare(right.locker.name, "ro"),
    )
    .slice(0, 80)
    .map(({ locker }) => locker);
  return json({ data: lockers });
}

export async function handleShippingCheckout(
  request: Request,
  env: CommerceEnv,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path === "/api/v1/shipping/easyboxes") {
    try {
      return await handleEasyboxList(request, env);
    } catch (error) {
      console.error("shipping.easybox_list_failed", {
        code: error instanceof ProviderError ? error.code : "EASYBOX_LIST_FAILED",
      });
      return json(
        {
          error: {
            message:
              error instanceof ProviderError && error.status < 500
                ? error.message
                : "Harta Easybox nu este disponibilă momentan. Încearcă din nou.",
          },
        },
        error instanceof ProviderError ? error.status : 503,
      );
    }
  }
  if (path !== "/api/v1/shipping/quotes") return null;
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
    if (!input.success || !["home_delivery", "easybox"].includes(input.data.shippingOption))
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
      (input.data.shippingOption === "home_delivery" && policy.use_live_quotes !== 1) ||
      (input.data.shippingOption === "easybox" && policy.easybox_enabled !== 1) ||
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
    const total = await checkoutSubtotal(
      env.DB,
      input.data.items,
      input.data.promotionCode,
      input.data.customer,
    );
    const customer = input.data.customer;
    const selectedLocker =
      input.data.shippingOption === "easybox"
        ? (await listSmartShipEasyboxes(env)).find(
            (locker) => locker.id === input.data.easyboxLockerId,
          )
        : null;
    if (input.data.shippingOption === "easybox" && !selectedLocker)
      throw new ProviderError(
        "Easybox-ul ales nu mai este disponibil. Alege un alt punct.",
        "EASYBOX_NOT_AVAILABLE",
        409,
      );
    if (
      selectedLocker?.supportsCashOnDelivery === false &&
      input.data.paymentMethod === "cash_on_delivery"
    )
      throw new ProviderError(
        "Acest easybox nu acceptă plata la ridicare. Alege plata online sau un alt punct.",
        "EASYBOX_COD_UNAVAILABLE",
        409,
      );
    const destination = selectedLocker ?? customer;
    const cityId = await resolveSmartShipCity(env, destination.county, destination.city);
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
        address: selectedLocker?.address ?? customer.address,
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
        lockerId: selectedLocker?.id,
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
          `INSERT INTO shipping_quotes(
             id,provider,method_code,courier_id,courier_name,locker_id,amount_bani,currency,
             own_contract,request_hash,expires_at,delivery_estimate,locker_name,locker_address,
             locker_city,locker_county,locker_postal_code,locker_latitude,locker_longitude
           ) VALUES(
             ?1,'smartship',?2,?3,?4,?5,?6,'RON',?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17
           )`,
        ).bind(
          o.id,
          input.data.shippingOption,
          o.courierId,
          o.courier,
          selectedLocker ? String(selectedLocker.id) : null,
          Math.round(o.price * 100),
          o.ownContract ? 1 : 0,
          hash,
          expiresAt,
          o.estimate,
          selectedLocker?.name ?? null,
          selectedLocker?.address ?? null,
          selectedLocker?.city ?? null,
          selectedLocker?.county ?? null,
          selectedLocker?.postalCode ?? null,
          selectedLocker?.latitude ?? null,
          selectedLocker?.longitude ?? null,
        ),
      ),
    );
    return json({ data: offers.map(({ courierId: _id, ownContract: _own, ...offer }) => offer) });
  } catch (error) {
    const providerError = error instanceof ProviderError ? error : null;
    const safe = Boolean(providerError && providerError.status < 500);
    console.error("shipping.quote_failed", {
      code: error instanceof ProviderError ? error.code : "QUOTE_FAILED",
    });
    return json(
      {
        error: {
          message: safe
            ? providerError!.message
            : "Nu am putut calcula livrarea acum. Poți încerca din nou sau folosi opțiunea de livrare afișată.",
        },
      },
      safe ? providerError!.status : 503,
    );
  }
}
