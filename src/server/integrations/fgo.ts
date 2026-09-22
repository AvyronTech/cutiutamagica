import {
  digestHex,
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { credential } from "@/server/services/growth-settings";

export interface FgoInvoiceInput {
  orderId: string;
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
    companyRegistrationNumber?: string | null;
  };
  lines: Array<{
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
}

export interface FgoInvoiceResult {
  number: string;
  series: string;
  pdfUrl: string | null;
  paymentUrl: string | null;
}

type FgoResponse = {
  Success?: boolean;
  Message?: string;
  Factura?: { Numar?: string; Serie?: string; Link?: string; LinkPlata?: string };
};

export async function emitFgoInvoice(
  env: CommerceEnv,
  input: FgoInvoiceInput,
): Promise<FgoInvoiceResult> {
  const privateKey = requiredSecret((await credential(env, "fgo")) ?? undefined, "FGO_PRIVATE_KEY");
  const production = env.APP_ENV === "production";
  const baseUrl = production ? "https://api.fgo.ro/v1" : "https://api-testuat.fgo.ro/v1";
  const taxId = "55055976";
  const hash = (
    await digestHex("SHA-1", `${taxId}${privateKey}${input.customer.name}`)
  ).toUpperCase();
  const payload = {
    CodUnic: taxId,
    Hash: hash,
    Serie: input.series,
    Valuta: input.currency,
    TipFactura: "Factura",
    TvaLaIncasare: false,
    VerificareDuplicat: true,
    IdExtern: input.orderId,
    PlatformaUrl: env.PUBLIC_SITE_URL,
    Client: {
      Denumire: input.customer.name,
      CodUnic: input.customer.companyTaxId || undefined,
      Email: input.customer.email || undefined,
      Telefon: input.customer.phone,
      Tara: input.customer.country,
      Judet: input.customer.county || undefined,
      Localitate: input.customer.city,
      Adresa: input.customer.address,
      Tip: input.customer.companyTaxId ? "PJ" : "PF",
      NrRegCom: input.customer.companyRegistrationNumber || undefined,
      PlatitorTVA: false,
    },
    Continut: input.lines.map((line) => ({
      Denumire: line.name,
      CodArticol: line.sku,
      NrProduse: line.quantity,
      UM: "BUC",
      CotaTVA: line.vatRate,
      PretUnitar: line.unitPrice,
    })),
  };
  const response = await fetchWithTimeout(
    `${baseUrl}/factura/emitere`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    },
    15_000,
  );
  const result = (await readProviderJson(response).catch(() => null)) as FgoResponse | null;
  if (!response.ok || !result?.Success || !result.Factura?.Numar || !result.Factura.Serie) {
    throw new ProviderError(
      result?.Message || `FGO a răspuns cu HTTP ${response.status}.`,
      "FGO_INVOICE_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  }
  return {
    number: result.Factura.Numar,
    series: result.Factura.Serie,
    pdfUrl: result.Factura.Link ?? null,
    paymentUrl: result.Factura.LinkPlata ?? null,
  };
}
