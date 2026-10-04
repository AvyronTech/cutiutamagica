import {
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { credential } from "@/server/services/growth-settings";
import type { EasyboxLocker } from "@/lib/easybox";

export interface SmartShipParty {
  name: string;
  address: string;
  email?: string;
  cityId: number;
  phone: string;
  country?: string;
  sector?: number;
}

export interface SmartShipContent {
  packageContent: string;
  parcels: number;
  weightKg: number;
  cashOnDeliveryRon: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceRon?: number;
  iban?: string;
  openPackage?: boolean;
  lockerId?: number;
  orderId?: string;
}

export interface SmartShipQuote {
  courierId: number;
  courierName: string;
  costRon: number;
  ownContract: boolean;
  deliveryDate: string | null;
}

function party(value: SmartShipParty) {
  return {
    name: value.name,
    address: value.address,
    email: value.email || undefined,
    city: value.cityId,
    phone: value.phone.replace(/[\s().-]/g, "").replace(/^\+?40/, "0"),
    country: value.country ?? "RO",
    sector: value.sector ?? 0,
  };
}

function content(value: SmartShipContent) {
  return {
    package_content: value.packageContent,
    parcels: value.parcels,
    weight: value.weightKg,
    cash_on_delivery: value.cashOnDeliveryRon,
    length: value.lengthCm,
    width: value.widthCm,
    height: value.heightCm,
    insurance: value.insuranceRon ?? 0,
    iban: value.iban ?? "",
    open_package: value.lockerId ? 0 : value.openPackage ? 1 : 0,
    locker_id: value.lockerId,
    order_id: value.orderId,
  };
}

async function smartShipFetch(
  env: CommerceEnv,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const apiKey = requiredSecret(
    (await credential(env, "smartship")) ?? undefined,
    "SMARTSHIP_API_KEY",
  );
  return fetchWithTimeout(`https://api.smartship.ro${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": apiKey,
      ...init.headers,
    },
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && !Array.isArray(value) && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function firstValue(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (source[key] != null) return source[key];
  return undefined;
}

function textValue(source: Record<string, unknown>, keys: string[]): string {
  const value = firstValue(source, keys);
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  const nested = record(value);
  return nested ? textValue(nested, ["name", "label", "value"]) : "";
}

function numberValue(source: Record<string, unknown>, keys: string[]): number | null {
  const value = Number(firstValue(source, keys));
  return Number.isFinite(value) ? value : null;
}

function paymentSupport(source: Record<string, unknown>): boolean | null {
  const value = firstValue(source, [
    "supportsCashOnDelivery",
    "supports_cash_on_delivery",
    "supportedPayment",
    "supported_payment",
    "cardPayment",
    "card_payment",
  ]);
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value))
    return value.some((entry) => /card|pos|cod|ramburs/i.test(String(entry)));
  const normalized = String(value).trim().toLowerCase();
  if (["0", "false", "none", "no", "nu"].includes(normalized)) return false;
  return /1|true|card|pos|cod|ramburs/.test(normalized) ? true : null;
}

function lockerArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const source = record(payload);
  if (!source) return [];
  for (const key of ["easybox", "easyboxes", "lockers", "points", "data", "results"]) {
    const candidate = source[key];
    if (Array.isArray(candidate)) return candidate;
    const nested = record(candidate);
    if (nested) {
      const found = lockerArray(nested);
      if (found.length) return found;
    }
  }
  return [];
}

function normalizeEasybox(value: unknown): EasyboxLocker | null {
  const source = record(value);
  if (!source) return null;
  const id = numberValue(source, ["locker_id", "lockerId", "id", "sameday_id"]);
  const latitude = numberValue(source, ["latitude", "lat", "gps_lat"]);
  const longitude = numberValue(source, ["longitude", "lng", "lon", "long", "gps_lng"]);
  const address = textValue(source, ["address", "address_line", "street"]);
  const city = textValue(source, ["city", "locality", "town"]);
  if (
    !id ||
    !address ||
    !city ||
    latitude == null ||
    longitude == null ||
    latitude < 40 ||
    latitude > 50 ||
    longitude < 18 ||
    longitude > 31
  )
    return null;
  return {
    id,
    name: textValue(source, ["name", "locker_name", "title"]) || `easybox ${id}`,
    address,
    city,
    county: textValue(source, ["county", "region", "administrative_area"]),
    postalCode: textValue(source, ["postal_code", "postalCode", "zip_code"]) || null,
    latitude,
    longitude,
    supportsCashOnDelivery: paymentSupport(source),
  };
}

export async function listSmartShipEasyboxes(env: CommerceEnv): Promise<EasyboxLocker[]> {
  const cacheKey = "smartship:easyboxes:v2";
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as EasyboxLocker[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      await env.CACHE.delete(cacheKey);
    }
  }
  const response = await smartShipFetch(env, "/geolocation/easybox", { method: "GET" });
  const payload = await readProviderJson(response, 8_000_000).catch(() => null);
  if (!response.ok)
    throw new ProviderError(
      "Lista easybox nu este disponibilă momentan.",
      "EASYBOX_LIST_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  const lockers = lockerArray(payload).flatMap((item) => {
    const locker = normalizeEasybox(item);
    return locker ? [locker] : [];
  });
  if (!lockers.length)
    throw new ProviderError(
      "Lista easybox primită de la furnizor nu este validă.",
      "EASYBOX_LIST_INVALID",
      502,
    );
  const unique = [...new Map(lockers.map((locker) => [locker.id, locker])).values()];
  await env.CACHE.put(cacheKey, JSON.stringify(unique), { expirationTtl: 21_600 });
  return unique;
}

export async function quoteSmartShip(
  env: CommerceEnv,
  input: { sender: SmartShipParty; recipient: SmartShipParty; content: SmartShipContent },
): Promise<SmartShipQuote[]> {
  const response = await smartShipFetch(env, "/cost", {
    method: "POST",
    body: JSON.stringify({
      show_byoc: 1,
      sender: party(input.sender),
      recipient: party(input.recipient),
      content: content(input.content),
    }),
  });
  const result = (await readProviderJson(response).catch(() => null)) as {
    status?: number;
    costs?: Array<{
      courier_id?: number;
      courier_name?: string;
      cost?: number;
      own_contract?: boolean;
      delivery_date?: string;
    }>;
    erori?: unknown;
  } | null;
  if (!response.ok || !Array.isArray(result?.costs)) {
    throw new ProviderError(
      `SmartShip nu a putut calcula livrarea (${response.status}).`,
      "SMARTSHIP_QUOTE_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  }
  return result.costs.flatMap((quote) =>
    quote.courier_id &&
    quote.courier_name &&
    Number.isFinite(quote.cost) &&
    Number(quote.cost) >= 0 &&
    Number(quote.cost) < 10000
      ? [
          {
            courierId: quote.courier_id,
            courierName: quote.courier_name,
            costRon: Number(quote.cost),
            ownContract: Boolean(quote.own_contract),
            deliveryDate: quote.delivery_date ?? null,
          },
        ]
      : [],
  );
}

export async function createSmartShipAwb(
  env: CommerceEnv,
  input: {
    courierId: number;
    useOwnContract: boolean;
    sender: SmartShipParty;
    recipient: SmartShipParty;
    content: SmartShipContent;
  },
): Promise<{ awb: string; trackingUrl: string | null; costRon: number | null }> {
  const response = await smartShipFetch(env, "/awb/new", {
    method: "POST",
    body: JSON.stringify({
      courier_id: input.courierId,
      use_own_contract: input.useOwnContract ? 1 : 0,
      sender: party(input.sender),
      recipient: party(input.recipient),
      content: content(input.content),
    }),
  });
  const result = (await readProviderJson(response).catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const awb = result && (result.awb ?? result.AWB ?? result.awb_number);
  if (!response.ok || typeof awb !== "string") {
    throw new ProviderError(
      `SmartShip nu a putut emite AWB-ul (${response.status}).`,
      "SMARTSHIP_AWB_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  }
  const tracking = result?.tracking_link;
  const cost = result?.cost;
  return {
    awb,
    trackingUrl: typeof tracking === "string" ? tracking : null,
    costRon: typeof cost === "number" ? cost : null,
  };
}

function localityKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, " ");
}
export async function resolveSmartShipCity(
  env: CommerceEnv,
  county: string,
  city: string,
): Promise<number> {
  async function locations(path: string) {
    const key = `smartship:locations:${path}`;
    const cached = await env.CACHE.get(key);
    if (cached) return JSON.parse(cached) as Record<string, unknown>;
    const response = await smartShipFetch(env, path, { method: "GET" });
    if (!response.ok)
      throw new ProviderError("Localitatea nu a putut fi verificată.", "LOCATION_UNAVAILABLE", 502);
    const value = (await readProviderJson(response)) as Record<string, unknown>;
    await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: 86400 });
    return value;
  }
  const counties = (await locations("/geolocation/counties")).counties as Array<{
    id: number;
    county: string;
  }>;
  const region = counties?.find((c) => localityKey(c.county) === localityKey(county));
  if (!region)
    throw new ProviderError("Verifică județul pentru calculul livrării.", "LOCATION_INVALID", 400);
  const cities = (await locations(`/geolocation/cities?county=${region.id}`)).cities as Array<{
    id: number;
    city: string;
  }>;
  const locality = cities?.find((c) => localityKey(c.city) === localityKey(city));
  if (!locality)
    throw new ProviderError(
      "Verifică localitatea pentru calculul livrării.",
      "LOCATION_INVALID",
      400,
    );
  return locality.id;
}
