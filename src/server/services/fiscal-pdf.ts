import { checkoutSettingsSchema } from "@/lib/checkout-settings";
import { readOblioInvoiceLink } from "../integrations/oblio";
import {
  digestHex,
  fetchWithTimeout,
  ProviderError,
  type CommerceEnv,
} from "../integrations/provider-runtime";

export const invoicePdfLimit = 10_000_000;

export function safeOblioPdfUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.origin !== "https://www.oblio.eu" ||
    url.username ||
    url.password ||
    url.hash ||
    !["/utils/show_file", "/utils/show_file/"].includes(url.pathname)
  )
    throw new ProviderError(
      "Adresa PDF nu a fost confirmată ca document Oblio.",
      "OBLIO_PDF_URL_INVALID",
      409,
    );
  return url;
}

export async function readFiscalPdf(response: Response): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (!response.ok || !reader || Number(response.headers.get("content-length")) > invoicePdfLimit) {
    await reader?.cancel();
    throw new ProviderError("PDF indisponibil sau prea mare.", "FISCAL_PDF_UNAVAILABLE", 409);
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, 15_000);
  try {
    while (true) {
      const part = await reader.read();
      if (timedOut)
        throw new ProviderError("PDF-ul nu a fost descărcat la timp.", "FISCAL_PDF_TIMEOUT", 504);
      if (part.done) break;
      length += part.value.byteLength;
      if (length > invoicePdfLimit) {
        await reader.cancel();
        throw new ProviderError("PDF prea mare.", "FISCAL_PDF_TOO_LARGE", 409);
      }
      chunks.push(part.value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new ProviderError("Furnizorul nu a returnat un fișier PDF.", "FISCAL_PDF_INVALID", 409);
  return bytes;
}

export type FiscalInvoice = {
  id: string;
  order_id: string;
  invoice_number: string;
  total_bani: number;
  currency: string;
  issued_at: string;
  channel_id: string;
  order_status: string;
  external_order_id: string | null;
};

export async function invoiceForOrder(
  db: D1Database,
  orderId: string,
): Promise<FiscalInvoice | null> {
  return db
    .prepare(
      `SELECT i.id,i.order_id,i.invoice_number,i.total_bani,i.currency,i.issued_at,o.channel_id,o.order_status,o.external_order_id
    FROM invoices i JOIN orders o ON o.id=i.order_id WHERE i.order_id=?1
    AND i.external_provider='oblio' AND i.invoice_type='invoice' AND i.status IN ('issued','paid')
    AND i.invoice_number IS NOT NULL AND i.issued_at IS NOT NULL ORDER BY i.issued_at DESC LIMIT 1`,
    )
    .bind(orderId)
    .first<FiscalInvoice>();
}

export async function officialOblioLink(env: CommerceEnv, invoice: FiscalInvoice) {
  const ref = /^([\w-]{1,40})-(\d{1,12})$/.exec(invoice.invoice_number);
  const [settings, entity] = await env.DB.batch<{ value_json: string; tax_id: string }>([
    env.DB.prepare("SELECT value_json FROM operational_settings WHERE key='commerce.checkout'"),
    env.DB.prepare(
      "SELECT tax_id FROM legal_entities WHERE id='legal_entity_main' AND status='verified'",
    ),
  ]);
  const checkout = checkoutSettingsSchema.parse(
    JSON.parse(settings.results[0]?.value_json || "{}"),
  );
  const taxId = entity.results[0]?.tax_id;
  if (!ref || !taxId || !checkout.oblioEmail)
    throw new ProviderError(
      "Verifică seria facturii și contul Oblio.",
      "OBLIO_PDF_SETTINGS_REQUIRED",
      409,
    );
  return safeOblioPdfUrl(
    await readOblioInvoiceLink(env, {
      accountEmail: checkout.oblioEmail,
      taxId,
      series: ref[1],
      number: ref[2],
    }),
  );
}

export async function downloadOblioPdf(url: URL) {
  const response = await fetchWithTimeout(safeOblioPdfUrl(url.toString()), {
    redirect: "manual",
    headers: { accept: "application/pdf" },
  });
  return readFiscalPdf(response);
}

export async function archiveFiscalPdf(
  env: CommerceEnv,
  invoice: Pick<FiscalInvoice, "id" | "invoice_number">,
  url: URL,
) {
  const bytes = await downloadOblioPdf(url);
  const key = `invoices/oblio/${invoice.id}.pdf`;
  const filename = `${invoice.invoice_number.replace(/[^a-z0-9_-]/gi, "_")}.pdf`;
  const checksum = await digestHex("SHA-256", bytes.buffer);
  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: "application/pdf", cacheControl: "private, no-store" },
  });
  await env.DB.prepare(
    `INSERT OR IGNORE INTO business_documents(
    id,document_type,entity_type,entity_id,r2_key,filename,mime_type,size_bytes,checksum_sha256,retention_class
    ) VALUES(?1,'invoice_pdf','invoice',?2,?3,?4,'application/pdf',?5,?6,'fiscal')`,
  )
    .bind(crypto.randomUUID(), invoice.id, key, filename, bytes.byteLength, checksum)
    .run();
  return { bytes, filename };
}

export async function fiscalPdf(env: CommerceEnv, invoice: FiscalInvoice) {
  const document = await env.DB.prepare(
    `SELECT r2_key,filename FROM business_documents
    WHERE entity_type='invoice' AND entity_id=?1 AND document_type='invoice_pdf'
    AND mime_type='application/pdf' AND status='active' ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(invoice.id)
    .first<{ r2_key: string; filename: string }>();
  if (document) {
    const object = await env.MEDIA.get(document.r2_key);
    if (object)
      return {
        bytes: await readFiscalPdf(
          new Response(object.body, { headers: { "content-length": String(object.size) } }),
        ),
        filename: document.filename,
      };
  }
  return archiveFiscalPdf(env, invoice, await officialOblioLink(env, invoice));
}

export function inlinePdf(bytes: Uint8Array<ArrayBuffer>, filename: string) {
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename.replace(/[^a-z0-9_.-]/gi, "_")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
