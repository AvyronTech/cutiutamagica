import {
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { credential } from "@/server/services/growth-settings";

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
    redirect: "error",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": apiKey,
      ...init.headers,
    },
  });
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
