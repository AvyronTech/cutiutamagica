import {
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { credential } from "@/server/services/growth-settings";

const OBLIO_API = "https://www.oblio.eu/api";

export interface OblioInvoiceInput {
  orderId: string;
  accountEmail: string;
  taxId: string;
  series: string;
  expectedNextNumber: number;
  currency: string;
  customer: {
    name: string;
    email?: string | null;
    phone: string;
    country: string;
    county?: string | null;
    city: string;
    address: string;
    companyTaxId?: string | null;
  };
  lines: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    itemType: "product" | "service";
  }>;
}

export interface OblioInvoiceResult {
  number: string;
  series: string;
  pdfUrl: string | null;
}

type OblioTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: string | number;
  statusMessage?: string;
};

type OblioInvoiceResponse = {
  status?: number;
  statusMessage?: string;
  data?: { seriesName?: string; number?: string | number; link?: string };
};

type OblioNomenclatureResponse<T> = {
  status?: number;
  statusMessage?: string;
  data?: T[];
};

async function nomenclature<T>(token: string, path: string): Promise<T[]> {
  const response = await fetchWithTimeout(`${OBLIO_API}/nomenclature/${path}`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const result = (await readProviderJson(response).catch(
    () => null,
  )) as OblioNomenclatureResponse<T> | null;
  if (!response.ok || result?.status !== 200 || !Array.isArray(result.data))
    throw new ProviderError(
      result?.statusMessage || "Nu am putut verifica datele contului Oblio.",
      "OBLIO_SETUP_UNVERIFIED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  return result.data;
}

async function accessToken(env: CommerceEnv, accountEmail: string): Promise<string> {
  const secret = requiredSecret(
    (await credential(env, "oblio")) ?? undefined,
    "OBLIO_CLIENT_SECRET",
  );
  const body = new URLSearchParams({ client_id: accountEmail, client_secret: secret });
  const response = await fetchWithTimeout(
    `${OBLIO_API}/authorize/token`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
    },
    15_000,
  );
  const result = (await readProviderJson(response).catch(() => null)) as OblioTokenResponse | null;
  if (!response.ok || !result?.access_token) {
    throw new ProviderError(
      result?.statusMessage || `Oblio a refuzat autorizarea (HTTP ${response.status}).`,
      "OBLIO_AUTH_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  }
  return result.access_token;
}

export async function emitOblioInvoice(
  env: CommerceEnv,
  input: OblioInvoiceInput,
): Promise<OblioInvoiceResult> {
  const token = await accessToken(env, input.accountEmail);
  const cif = input.taxId.replace(/^RO/i, "").replace(/\D/g, "");
  const companies = await nomenclature<{ cif?: string }>(token, "companies");
  if (
    !cif ||
    !companies.some((company) => company.cif?.replace(/^RO/i, "").replace(/\D/g, "") === cif)
  )
    throw new ProviderError(
      "Contul Oblio conectat nu conține firma Cutiuța Magică din profilul juridic.",
      "OBLIO_COMPANY_MISMATCH",
      409,
    );
  const query = new URLSearchParams({ cif: input.taxId });
  const series = await nomenclature<{
    type?: string;
    name?: string;
    start?: string | number;
    next?: string | number;
  }>(token, `series?${query}`);
  const invoiceSeries = series.find(
    (item) => item.type === "Factura" && item.name === input.series,
  );
  if (
    !invoiceSeries ||
    Number(invoiceSeries.start) !== 1 ||
    Number(invoiceSeries.next) !== input.expectedNextNumber
  )
    throw new ProviderError(
      "Seria Oblio trebuie să înceapă cu 0001, iar următorul număr să corespundă registrului magazinului.",
      "OBLIO_SERIES_MISMATCH",
      409,
    );
  if (input.lines.some((line) => line.vatRate !== 0))
    throw new ProviderError(
      "Regimul neplătitor de TVA cere linii fără TVA colectată.",
      "OBLIO_VAT_MISMATCH",
      409,
    );
  const vatRates = await nomenclature<{ name?: string; percent?: number | string }>(
    token,
    `vat_rates?${query}`,
  );
  const nonVatRate = vatRates.find(
    (rate) => Number(rate.percent) === 0 && /neplătitor|neplatitor/i.test(rate.name ?? ""),
  );
  if (!nonVatRate?.name)
    throw new ProviderError(
      "Cota pentru neplătitor de TVA nu este configurată în Oblio.",
      "OBLIO_NON_VAT_RATE_MISSING",
      409,
    );
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    cif: input.taxId,
    client: {
      cif: input.customer.companyTaxId || "",
      name: input.customer.name,
      address: input.customer.address,
      state: input.customer.county || "",
      city: input.customer.city,
      country: input.customer.country || "RO",
      email: input.customer.email || "",
      phone: input.customer.phone,
      vatPayer: false,
    },
    issueDate: today,
    seriesName: input.series,
    orderNumber: input.orderId,
    language: "RO",
    precision: 2,
    currency: input.currency,
    useStock: 0,
    idempotencyKey: `cutiuta-magica/${input.orderId}/invoice-v1`,
    internalNote: `Comanda ${input.orderId}`,
    products: input.lines.map((line) => ({
      name: line.name,
      code: line.sku,
      price: Number(line.unitPrice.toFixed(2)),
      measuringUnit: line.itemType === "service" ? "serv" : "buc",
      vatName: nonVatRate.name,
      vatPercentage: 0,
      vatIncluded: 1,
      quantity: line.quantity,
      productType: line.itemType === "service" ? "Serviciu" : "Marfa",
    })),
  };
  const response = await fetchWithTimeout(
    `${OBLIO_API}/docs/invoice`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        "content-type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(payload),
    },
    15_000,
  );
  const result = (await readProviderJson(response).catch(
    () => null,
  )) as OblioInvoiceResponse | null;
  if (
    !response.ok ||
    result?.status !== 200 ||
    !result.data?.seriesName ||
    result.data.number == null ||
    result.data.seriesName !== input.series ||
    !/^\d{1,12}$/.test(String(result.data.number))
  ) {
    throw new ProviderError(
      result?.statusMessage || `Oblio a răspuns cu HTTP ${response.status}.`,
      "OBLIO_INVOICE_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  }
  return {
    number: String(result.data.number),
    series: result.data.seriesName,
    pdfUrl: result.data.link ?? null,
  };
}
