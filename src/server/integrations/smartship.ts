import {
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { credential } from "@/server/services/growth-settings";
import type { EasyboxLocker } from "@/lib/easybox";
import { normalizeIban } from "@/lib/iban";
import { PRINT_REQUIRED_COURIER_IDS } from "@/server/services/smartship-couriers";

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

export interface SmartShipQuoteProbe {
  variant: "configured" | "without_own_contracts" | "documented_sample";
  httpStatus: number;
  providerStatus: number | null;
  courierCount: number;
  eligibleOffers: Array<{ courier: string; costRon: number }>;
  errorIds: number[];
  message: string | null;
}

export interface SmartShipQuoteDiagnostics {
  checkedAt: string;
  probes: SmartShipQuoteProbe[];
}

export interface SmartShipTrackingEvent {
  date: string;
  eventId: string;
  description: string;
  locality: string;
}

export interface SmartShipTracking {
  awb: string;
  status: "label_created" | "in_transit" | "delivered" | "exception" | "returned" | "cancelled";
  statusDescription: string;
  carrier: string;
  trackingUrl: string | null;
  events: SmartShipTrackingEvent[];
}

export function smartShipTrackingUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "smartship.ro" || url.hostname.endsWith(".smartship.ro"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseSmartShipTracking(payload: unknown, expectedAwb: string): SmartShipTracking {
  const source = record(payload);
  const awb = source ? textValue(source, ["awb"]) : "";
  const code = source ? Number(source.awb_status) : NaN;
  const status = (
    {
      0: "label_created",
      1: "in_transit",
      2: "delivered",
      5: "exception",
      6: "returned",
      10: "cancelled",
    } as Record<number, SmartShipTracking["status"]>
  )[code];
  if (!source || source.status !== 200 || awb !== expectedAwb || !status)
    throw new ProviderError(
      "SmartShip nu a confirmat statusul acestui AWB.",
      "SMARTSHIP_TRACKING_INVALID",
      502,
    );
  const events = Array.isArray(source.tracking)
    ? source.tracking.slice(0, 50).flatMap((item) => {
        const event = record(item);
        if (!event) return [];
        const date = textValue(event, ["date"]).slice(0, 32);
        const description = textValue(event, ["description"]).slice(0, 500);
        if (!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(date) || !description) return [];
        return [
          {
            date,
            eventId: textValue(event, ["event_id"]).slice(0, 80),
            description,
            locality: textValue(event, ["locality"]).slice(0, 120),
          },
        ];
      })
    : [];
  return {
    awb,
    status,
    statusDescription: textValue(source, ["awb_status_desc"]).slice(0, 120),
    carrier: textValue(source, ["carrier"]).slice(0, 120),
    trackingUrl: smartShipTrackingUrl(source.tracking_link),
    events,
  };
}

export async function getSmartShipTracking(
  env: CommerceEnv,
  awb: string,
): Promise<SmartShipTracking> {
  if (!/^[A-Za-z0-9-]{3,80}$/.test(awb))
    throw new ProviderError("AWB-ul nu este valid.", "SMARTSHIP_AWB_INVALID", 400);
  const response = await smartShipFetch(env, `/awb/status/${encodeURIComponent(awb)}`, {
    method: "GET",
  });
  if (!response.ok)
    throw new ProviderError(
      "Statusul AWB nu este disponibil momentan la SmartShip.",
      "SMARTSHIP_TRACKING_FAILED",
      502,
      response.status >= 500,
    );
  return parseSmartShipTracking(await readProviderJson(response, 256_000), awb);
}

export interface SmartShipAccountOverview {
  checkedAt: string;
  balance: {
    amount: number;
    availableForShipping: number;
    creditLimit: number;
    currency: string;
  } | null;
  shipments: {
    total: number;
    recent: Array<{ awb: string; status: number; courier: string; orderId: string }>;
  } | null;
  payouts: {
    total: number;
    recent: Array<{ number: string; date: string; amount: number; awbCount: number }>;
  } | null;
  invoices: {
    total: number;
    recent: Array<{
      number: string;
      date: string;
      amount: number;
      currency: string;
      pdfUrl: string | null;
    }>;
  } | null;
  errors: string[];
}

export async function getSmartShipAccountOverview(
  env: CommerceEnv,
): Promise<SmartShipAccountOverview> {
  const paths = [
    "/account/balance",
    "/awbs?per_page=10",
    "/payouts?per_page=5",
    "/invoices?per_page=5",
  ] as const;
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const response = await smartShipFetch(env, path, { method: "GET" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = record(await readProviderJson(response, 256_000));
      if (!payload || payload.status !== 200) throw new Error("Răspuns invalid");
      return payload;
    }),
  );
  const [balance, shipments, payouts, invoices] = results.map((result) =>
    result.status === "fulfilled" ? result.value : null,
  );
  const errors = results.flatMap((result, index) =>
    result.status === "rejected" ? [paths[index]] : [],
  );
  const safeNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    checkedAt: new Date().toISOString(),
    balance:
      balance &&
      safeNumber(balance.balance) != null &&
      safeNumber(balance.available_for_shipping) != null &&
      safeNumber(balance.credit_limit) != null
        ? {
            amount: safeNumber(balance.balance)!,
            availableForShipping: safeNumber(balance.available_for_shipping)!,
            creditLimit: safeNumber(balance.credit_limit)!,
            currency: ["RON", "EUR"].includes(textValue(balance, ["currency"]))
              ? textValue(balance, ["currency"])
              : "RON",
          }
        : null,
    shipments: shipments
      ? {
          total: Math.max(0, safeNumber(shipments.total_awbs_count) ?? 0),
          recent: (Array.isArray(shipments.awbs) ? shipments.awbs : [])
            .slice(0, 10)
            .flatMap((value) => {
              const row = record(value);
              const awb = row ? textValue(row, ["awb"]) : "";
              if (!row || !/^[A-Za-z0-9-]{3,80}$/.test(awb)) return [];
              return [
                {
                  awb,
                  status: safeNumber(row.status) ?? -1,
                  courier: textValue(row, ["courier_name"]).slice(0, 120),
                  orderId: textValue(row, ["order_id"]).slice(0, 120),
                },
              ];
            }),
        }
      : null,
    payouts: payouts
      ? {
          total: Math.max(0, safeNumber(payouts.total_payouts_count) ?? 0),
          recent: (Array.isArray(payouts.payouts) ? payouts.payouts : [])
            .slice(0, 5)
            .flatMap((value) => {
              const row = record(value);
              if (!row) return [];
              return [
                {
                  number: textValue(row, ["number"]).slice(0, 80),
                  date: textValue(row, ["date"]).slice(0, 32),
                  amount: safeNumber(row.valoare) ?? 0,
                  awbCount: safeNumber(row.awb_count) ?? 0,
                },
              ];
            }),
        }
      : null,
    invoices: invoices
      ? {
          total: Math.max(0, safeNumber(invoices.total_invoices_count) ?? 0),
          recent: (Array.isArray(invoices.invoices) ? invoices.invoices : [])
            .slice(0, 5)
            .flatMap((value) => {
              const row = record(value);
              if (!row) return [];
              return [
                {
                  number: textValue(row, ["number"]).slice(0, 80),
                  date: textValue(row, ["date"]).slice(0, 32),
                  amount: safeNumber(row.total) ?? 0,
                  currency: ["RON", "EUR"].includes(textValue(row, ["currency"]))
                    ? textValue(row, ["currency"])
                    : "RON",
                  pdfUrl: smartShipTrackingUrl(row.pdf_link),
                },
              ];
            }),
        }
      : null,
    errors,
  };
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

// SmartShip confirmed that its API currently rejects Romanian diacritics in
// request text with status 91929. Keep the original customer data in our DB.
function smartShipBody(value: unknown): string {
  return JSON.stringify(value, (_key, field) =>
    typeof field === "string" ? field.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : field,
  );
}

function safeQuoteMessage(value: unknown, sender: SmartShipParty): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim().slice(0, 300);
  if (!message) return null;
  return message
    .replaceAll(sender.address, "[adresă]")
    .replaceAll(sender.phone, "[telefon]")
    .replaceAll(sender.email || "\u0000", "[e-mail]")
    .replace(/\bRO\d{2}[A-Z0-9]{20,}\b/gi, "[IBAN]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mail]")
    .replace(/(?:\+?40|0)[\s().-]*7(?:[\s().-]*\d){8}\b/g, "[telefon]");
}

/** Read-only /cost checks using the configured sender and the public documentation sample. */
export async function diagnoseSmartShipQuote(
  env: CommerceEnv,
  sender: SmartShipParty,
  parcel: Pick<SmartShipContent, "weightKg" | "lengthCm" | "widthCm" | "heightCm">,
): Promise<SmartShipQuoteDiagnostics> {
  const sampleSender: SmartShipParty = {
    name: "Magazinul Meu SRL",
    address: "Str. Polonă 68",
    email: "expeditor@magazin.ro",
    cityId: 255154,
    phone: "0720333222",
    country: "RO",
    sector: 1,
  };
  const recipient: SmartShipParty = {
    name: "Ion Vasile",
    address: "Str. Memorandumului 28",
    email: "client@email.com",
    cityId: 256212,
    phone: "0720123456",
    country: "RO",
    sector: 0,
  };
  const packageDetails = content({
    packageContent: "Cutiuțe muzicale",
    parcels: 1,
    cashOnDeliveryRon: 0,
    ...parcel,
  });
  const variants = [
    { variant: "configured", sender, showByoc: 1 },
    { variant: "without_own_contracts", sender, showByoc: 0 },
    { variant: "documented_sample", sender: sampleSender, showByoc: 0 },
  ] as const;
  const probes: SmartShipQuoteProbe[] = [];
  for (const probe of variants) {
    const response = await smartShipFetch(env, "/cost", {
      method: "POST",
      body: smartShipBody({
        show_byoc: probe.showByoc,
        sender: party(probe.sender),
        recipient: party(recipient),
        content: packageDetails,
      }),
    });
    const body = record(await readProviderJson(response).catch(() => null));
    const eligibleOffers = (body && Array.isArray(body.costs) ? body.costs : [])
      .flatMap((entry) => {
        const quote = record(entry);
        const courierId = quote?.courier_id;
        const courier = quote?.courier_name;
        const costRon = quote?.cost;
        return typeof courierId === "number" &&
          !PRINT_REQUIRED_COURIER_IDS.has(courierId) &&
          typeof courier === "string" &&
          courier.length <= 80 &&
          typeof costRon === "number" &&
          Number.isFinite(costRon) &&
          costRon >= 0 &&
          costRon < 10_000
          ? [{ courier, costRon }]
          : [];
      })
      .sort((a, b) => a.costRon - b.costRon)
      .slice(0, 12);
    probes.push({
      variant: probe.variant,
      httpStatus: response.status,
      providerStatus: body && typeof body.status === "number" ? body.status : null,
      courierCount: body && Array.isArray(body.costs) ? body.costs.length : 0,
      eligibleOffers,
      errorIds:
        body && Array.isArray(body.erori)
          ? body.erori
              .flatMap((entry) => {
                const id = record(entry)?.id;
                return typeof id === "number" ? [id] : [];
              })
              .slice(0, 8)
          : [],
      message: safeQuoteMessage(body?.message ?? body?.err, probe.sender),
    });
    if (probe.variant === "configured" && response.ok && Array.isArray(body?.costs)) break;
  }
  return { checkedAt: new Date().toISOString(), probes };
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

async function contentWithCodIban(env: CommerceEnv, value: SmartShipContent) {
  if (value.cashOnDeliveryRon <= 0) return content(value);
  const iban = normalizeIban(value.iban || (await credential(env, "smartship_cod_iban")) || "");
  if (!iban)
    throw new ProviderError(
      "Rambursul prin curier nu este disponibil momentan. Alege plata online sau contactează-ne.",
      "SMARTSHIP_COD_IBAN_MISSING",
      409,
    );
  return content({ ...value, iban });
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
    body: smartShipBody({
      show_byoc: 1,
      sender: party(input.sender),
      recipient: party(input.recipient),
      content: await contentWithCodIban(env, input.content),
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
  if (result?.status === 999 && Array.isArray(result.erori)) {
    const sectorMissing = result.erori.some((entry) => record(entry)?.id === 302501);
    throw new ProviderError(
      sectorMissing
        ? "Alege sectorul de livrare pentru București și actualizează ofertele."
        : "SmartShip nu a acceptat datele de livrare. Verifică numele, telefonul și adresa.",
      "SMARTSHIP_QUOTE_VALIDATION",
      409,
    );
  }
  if (result?.status === 201)
    throw new ProviderError(
      "Tariful pentru ramburs nu poate fi calculat acum. Contactează-ne pentru această opțiune.",
      "SMARTSHIP_COD_IBAN_INVALID",
      409,
    );
  if (!response.ok || !Array.isArray(result?.costs)) {
    console.error("smartship.quote_rejected", {
      httpStatus: response.status,
      providerStatus: typeof result?.status === "number" ? result.status : null,
      errorIds: Array.isArray(result?.erori)
        ? result.erori
            .map((entry) => record(entry)?.id)
            .filter((id): id is number => typeof id === "number")
            .slice(0, 8)
        : [],
      hasCosts: Array.isArray(result?.costs),
      contentType: response.headers.get("content-type"),
    });
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
    body: smartShipBody({
      courier_id: input.courierId,
      use_own_contract: input.useOwnContract ? 1 : 0,
      sender: party(input.sender),
      recipient: party(input.recipient),
      content: await contentWithCodIban(env, input.content),
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
  const tracking = result?.tracking_url ?? result?.tracking_link;
  const cost = result?.cost;
  return {
    awb,
    trackingUrl: typeof tracking === "string" ? tracking : null,
    costRon: typeof cost === "number" ? cost : null,
  };
}

export async function findSmartShipAwbByOrderId(
  env: CommerceEnv,
  orderNumber: string,
): Promise<{ awb: string; trackingUrl: string | null } | null> {
  const response = await smartShipFetch(env, `/awb/order_id/${encodeURIComponent(orderNumber)}`, {
    method: "GET",
  });
  const result = (await readProviderJson(response).catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new ProviderError(
      "Nu am putut verifica AWB-ul la SmartShip.",
      "SMARTSHIP_AWB_LOOKUP_FAILED",
      502,
    );
  }
  if (typeof result?.awb !== "string" || !result.awb.trim()) return null;
  return {
    awb: result.awb,
    trackingUrl: typeof result.tracking_link === "string" ? result.tracking_link : null,
  };
}

export async function getSmartShipLabel(env: CommerceEnv, awb: string): Promise<Response> {
  if (!/^[A-Za-z0-9-]{3,80}$/.test(awb))
    throw new ProviderError("AWB-ul nu este valid.", "SMARTSHIP_AWB_INVALID", 400);
  const response = await smartShipFetch(env, `/awb/print/${encodeURIComponent(awb)}/A4`, {
    method: "GET",
  });
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("pdf"))
    throw new ProviderError(
      "Eticheta nu este disponibilă momentan.",
      "SMARTSHIP_LABEL_UNAVAILABLE",
      502,
    );
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="AWB-${awb}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
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
  const requestedCity = localityKey(city);
  const lookupCity =
    localityKey(county) === "bucuresti" && /^sector(?:ul)? [1-6]$/.test(requestedCity)
      ? "bucuresti"
      : requestedCity;
  const locality = cities?.find((c) => localityKey(c.city) === lookupCity);
  if (!locality)
    throw new ProviderError(
      "Verifică localitatea pentru calculul livrării.",
      "LOCATION_INVALID",
      400,
    );
  return locality.id;
}
