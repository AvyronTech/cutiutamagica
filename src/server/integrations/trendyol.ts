import { z } from "zod";
import { credential } from "../services/growth-settings";
import {
  ProviderError,
  fetchWithTimeout,
  readProviderJson,
  type CommerceEnv,
} from "./provider-runtime";

export const trendyolCredentialsSchema = z.object({
  sellerId: z.string().regex(/^\d{1,20}$/),
  apiKey: z.string().min(8).max(512),
  apiSecret: z.string().min(8).max(512),
  storeFrontCode: z.literal("RO"),
});
export type TrendyolCredentials = z.infer<typeof trendyolCredentialsSchema>;
export class TrendyolReviewError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
export function bani(value: unknown): number {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    !/^\d+(\.\d{1,6})?$/.test(String(value))
  )
    throw new TrendyolReviewError("INVALID_AMOUNT");
  const n = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(n) || n < 0 || n > 100_000_000)
    throw new TrendyolReviewError("INVALID_AMOUNT");
  return n;
}
const text = (v: unknown, max = 500) =>
  typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : "";
const id = (v: unknown) => {
  const s = typeof v === "string" || typeof v === "number" ? String(v) : "";
  if (!/^[\w-]{1,100}$/.test(s)) throw new TrendyolReviewError("INVALID_IDENTIFIER");
  return s;
};
type Raw = Record<string, unknown>;
function object(v: unknown): Raw {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new TrendyolReviewError("INVALID_RESPONSE");
  return v as Raw;
}
export type TrendyolAddress = {
  companyName: string;
  taxId: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
};
function address(value: unknown): TrendyolAddress {
  const a = object(value);
  return {
    companyName: text(a.company, 200),
    taxId: text(a.taxNumber, 50),
    name: text(a.fullName) || [text(a.firstName), text(a.lastName)].join(" ").trim(),
    phone: text(a.phone, 40),
    line1: text(a.address1) || text(a.fullAddress),
    line2: text(a.address2),
    city: text(a.city),
    county: text(a.countyName) || text(a.district),
    postalCode: text(a.postalCode, 30),
    country: text(a.countryCode, 2),
  };
}
export interface TrendyolLine {
  id: string;
  sku: string;
  barcode: string;
  sourceName: string;
  quantity: number;
  gross: number;
  sellerDiscount: number;
  platformDiscount: number;
  net: number;
  sourceVatRate: number | null;
  commissionRate: number | null;
  campaignId: string;
}
export interface TrendyolPackage {
  isCod: boolean;
  sellerId: string;
  orderNumber: string;
  id: string;
  status: string;
  lastModified: number;
  orderDate: number;
  gross: number;
  sellerDiscount: number;
  platformDiscount: number;
  net: number;
  currency: "RON";
  customerName: string;
  customerEmail: string;
  shipping: TrendyolAddress;
  billing: TrendyolAddress;
  cargoNumber: string;
  shipmentNumber: string;
  carrier: string;
  invoiceStatus: string;
  invoiceNumber: string;
  campaigns: { name: string; amount: number }[];
  lines: TrendyolLine[];
}
const statuses = new Set([
  "Awaiting",
  "Verified",
  "Created",
  "Picking",
  "Invoiced",
  "Shipped",
  "AtCollectionPoint",
  "Delivered",
  "UnDelivered",
  "Returned",
  "Cancelled",
  "UnSupplied",
  "UnPacked",
]);
export const inactiveTrendyolPackage = (status: string) =>
  ["Cancelled", "UnSupplied", "UnPacked"].includes(status);
export const consumedTrendyolPackage = (status: string) =>
  ["Shipped", "AtCollectionPoint", "Delivered", "UnDelivered", "Returned"].includes(status);
/** Order V2/stream fields only. Legacy totals never silently replace missing V2 financials. */
export function normalizeTrendyolPackage(value: unknown, expectedSeller: string): TrendyolPackage {
  const p = object(value);
  const reportedSeller = p.supplierId ?? p.sellerId;
  // RO V2 can return package supplierId=0. In that case every line must
  // explicitly attest the authenticated/requested seller; never infer from SKU.
  const sellerFromLines = reportedSeller == null || String(reportedSeller) === "0";
  const sellerId = sellerFromLines ? expectedSeller : id(reportedSeller);
  if (sellerId !== expectedSeller || p.currencyCode !== "RON" || p.orderCountryCode !== "RO")
    throw new TrendyolReviewError("ACCOUNT_OR_MARKET_MISMATCH");
  const status = text(p.status ?? p.shipmentPackageStatus);
  if (!statuses.has(status)) throw new TrendyolReviewError("UNKNOWN_PACKAGE_STATUS");
  if (
    !Array.isArray(p.lines) ||
    !p.lines.length ||
    p.lines.length > 30 ||
    Number(p.totalSgrFee ?? 0) !== 0
  )
    throw new TrendyolReviewError("ORDER_REQUIRES_REVIEW");
  const lines = p.lines.map((value) => {
    const l = object(value),
      quantity = Number(l.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
      throw new TrendyolReviewError("INVALID_QUANTITY");
    const gross = bani(l.lineGrossAmount) * quantity;
    const details =
      Array.isArray(l.discountDetails) && l.discountDetails.length
        ? l.discountDetails.map(object)
        : null;
    if (details && details.length !== quantity)
      throw new TrendyolReviewError("DISCOUNT_QUANTITY_MISMATCH");
    const sellerDiscount = details
      ? details.reduce((n, d) => n + bani(d.lineItemSellerDiscount), 0)
      : bani(l.lineSellerDiscount) * quantity;
    const platformDiscount = details
      ? details.reduce((n, d) => n + bani(d.lineItemTyDiscount), 0)
      : bani(l.lineTyDiscount) * quantity;
    const net = details
      ? details.reduce((n, d) => n + bani(d.lineItemPrice), 0)
      : bani(l.lineUnitPrice) * quantity;
    if (gross - sellerDiscount - platformDiscount !== net)
      throw new TrendyolReviewError("LINE_TOTAL_MISMATCH");
    if (
      (sellerFromLines && l.sellerId == null) ||
      (l.sellerId != null && id(l.sellerId) !== expectedSeller)
    )
      throw new TrendyolReviewError("LINE_SELLER_MISMATCH");
    return {
      id: id(l.lineId ?? l.id),
      sku: id(l.stockCode),
      barcode: text(l.barcode, 100),
      sourceName: text(l.productName, 300),
      quantity,
      gross,
      sellerDiscount,
      platformDiscount,
      net,
      sourceVatRate: typeof l.vatRate === "number" ? l.vatRate : null,
      commissionRate: typeof l.commission === "number" ? l.commission : null,
      campaignId: text(l.salesCampaignId, 100),
    };
  });
  if (new Set(lines.map((l) => l.id)).size !== lines.length)
    throw new TrendyolReviewError("DUPLICATE_LINE");
  const gross = bani(p.packageGrossAmount),
    sellerDiscount = bani(p.packageSellerDiscount),
    platformDiscount = bani(p.packageTyDiscount),
    net = bani(p.packageTotalPrice);
  const sum = (key: "gross" | "sellerDiscount" | "platformDiscount" | "net") =>
    lines.reduce((n, l) => n + l[key], 0);
  if (
    sum("gross") !== gross ||
    sum("sellerDiscount") !== sellerDiscount ||
    sum("net") !== net ||
    gross - sellerDiscount - sum("platformDiscount") !== net
  )
    throw new TrendyolReviewError("PACKAGE_TOTAL_MISMATCH");
  // B2C packageTyDiscount can be zero even when item-level platform discounts exist.
  if (platformDiscount !== 0 && platformDiscount !== sum("platformDiscount"))
    throw new TrendyolReviewError("PLATFORM_DISCOUNT_MISMATCH");
  const lastModified = Number(p.lastModifiedDate),
    orderDate = Number(p.orderDate);
  if (
    !Number.isSafeInteger(lastModified) ||
    !Number.isSafeInteger(orderDate) ||
    orderDate <= 0 ||
    lastModified < orderDate
  )
    throw new TrendyolReviewError("INVALID_SOURCE_TIME");
  return {
    isCod: p.isCod === true,
    sellerId,
    orderNumber: id(p.orderNumber),
    id: id(p.shipmentPackageId),
    status,
    lastModified,
    orderDate,
    gross,
    sellerDiscount,
    platformDiscount: sum("platformDiscount"),
    net,
    currency: "RON",
    customerName: [text(p.customerFirstName), text(p.customerLastName)].join(" ").trim(),
    customerEmail: text(p.customerEmail, 320),
    shipping: address(p.shipmentAddress),
    billing: address(p.invoiceAddress),
    cargoNumber: text(p.cargoTrackingNumber, 100),
    shipmentNumber: text(p.shipmentNumber, 100),
    carrier: text(p.cargoProviderName, 100),
    invoiceStatus: text(p.invoiceStatus, 100),
    invoiceNumber: text(p.invoiceNumber, 100),
    campaigns: Array.isArray(p.discountDisplays)
      ? p.discountDisplays.slice(0, 20).map((v) => {
          const d = object(v);
          return { name: text(d.displayName, 200), amount: bani(d.discountAmount) };
        })
      : [],
    lines,
  };
}

export async function trendyolCredentials(env: CommerceEnv): Promise<TrendyolCredentials> {
  const value = await credential(env, "trendyol");
  try {
    return trendyolCredentialsSchema.parse(JSON.parse(value || "{}"));
  } catch {
    throw new ProviderError(
      "Configurează seller ID, API key și API secret Trendyol pentru piața RO.",
      "TRENDYOL_SETUP_REQUIRED",
      409,
    );
  }
}
/** Fixed official origin, no redirects, no caller-controlled URL, no credentials in errors/logs. */
export async function trendyolRequest(
  c: TrendyolCredentials,
  path: string,
  params: Record<string, string> = {},
  body?: unknown,
): Promise<unknown> {
  if (
    !path.startsWith("/integration/") ||
    path.includes("..") ||
    path.includes("?") ||
    path.includes("\\")
  )
    throw new Error("INVALID_TRENDYOL_PATH");
  const url = new URL(path, "https://apigw.trendyol.com");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = await fetchWithTimeout(url, {
    method: body === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: {
      Authorization: `Basic ${btoa(c.apiKey + ":" + c.apiSecret)}`,
      storeFrontCode: c.storeFrontCode,
      "User-Agent": `${c.sellerId} - CutiutaMagicaSelfIntegration`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok)
    throw new ProviderError(
      response.status === 429
        ? "Trendyol limitează temporar cererile. Reîncearcă după pauză."
        : "Trendyol nu a confirmat cererea. Verifică accesul și starea din portal.",
      `TRENDYOL_HTTP_${response.status}`,
      response.status === 401 || response.status === 403 ? 409 : 502,
      response.status === 429 || response.status >= 500,
    );
  return readProviderJson(response, 1_500_000);
}
export async function getTrendyolOrder(
  c: TrendyolCredentials,
  orderNumber: string,
): Promise<TrendyolPackage[]> {
  const raw = object(
    await trendyolRequest(c, `/integration/order/sellers/${c.sellerId}/v2/orders`, {
      orderNumber: id(orderNumber),
      size: "50",
    }),
  );
  if (!Array.isArray(raw.content) || Number(raw.totalPages) > 1 || !raw.content.length)
    throw new TrendyolReviewError("ORDER_NOT_COMPLETE");
  const packages = raw.content.map((p) => normalizeTrendyolPackage(p, c.sellerId));
  if (packages.some((p) => p.orderNumber !== orderNumber))
    throw new TrendyolReviewError("ORDER_ID_MISMATCH");
  return packages;
}
export async function getTrendyolStream(
  c: TrendyolCredentials,
  start: number,
  end: number,
  cursor?: string,
) {
  const raw = object(
    await trendyolRequest(c, `/integration/order/sellers/${c.sellerId}/orders/stream`, {
      lastModifiedStartDate: String(start),
      lastModifiedEndDate: String(end),
      size: "1",
      ...(cursor ? { nextCursor: cursor } : {}),
    }),
  );
  if (
    !Array.isArray(raw.content) ||
    raw.content.length > 1 ||
    typeof raw.hasMore !== "boolean" ||
    (raw.hasMore && typeof raw.nextCursor !== "string")
  )
    throw new TrendyolReviewError("INVALID_STREAM_RESPONSE");
  return {
    orders: [...new Set(raw.content.map((p) => id(object(p).orderNumber)))],
    hasMore: raw.hasMore,
    nextCursor: typeof raw.nextCursor === "string" ? raw.nextCursor : null,
  };
}
