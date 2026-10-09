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
      vatName: "Normala",
      vatPercentage: Number(line.vatRate.toFixed(2)),
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
    result.data.number == null
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
