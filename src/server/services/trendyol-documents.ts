import {
  trendyolCredentials,
  trendyolRequest,
  TrendyolReviewError,
  type TrendyolPackage,
} from "../integrations/trendyol";
import { fetchWithTimeout, type CommerceEnv } from "../integrations/provider-runtime";
const escape = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const money = (n: number) =>
  (n / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" });
export function safeTrendyolLabelUrl(value: string): URL {
  const url = new URL(value);
  const allowed =
    url.hostname === "cdn.dsmcdn.com" ||
    (url.hostname === "apigw.trendyol.com" &&
      /^\/delivery\/partner\/objects\/[a-f0-9-]{36}$/.test(url.pathname)) ||
    (url.hostname === "s3.trendyol.com" &&
      url.pathname.startsWith("/delivery-international-prod/"));
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed)
    throw new TrendyolReviewError("UNSAFE_LABEL_URL");
  return url;
}
export async function trendyolLabel(env: CommerceEnv, orderId: string, packageId: string) {
  const row = await env.DB.prepare(
    `SELECT p.cargo_number,s.seller_id FROM marketplace_packages p JOIN marketplace_order_sources s ON s.order_id=p.order_id WHERE p.order_id=?1 AND p.external_package_id=?2 AND p.provider='trendyol'`,
  )
    .bind(orderId, packageId)
    .first<{ cargo_number: string; seller_id: string }>();
  const c = await trendyolCredentials(env);
  if (!row || row.seller_id !== c.sellerId || !row.cargo_number)
    throw new TrendyolReviewError("PACKAGE_NOT_FOUND");
  const data = (await trendyolRequest(c, `/integration/sellers/${c.sellerId}/common-label/query`, {
    id: row.cargo_number,
  })) as { data?: { format: string; label: string }[] };
  const label = data.data?.find((v) => v.format === "PDF");
  if (!label) throw new TrendyolReviewError("PROVIDER_LABEL_NOT_READY");
  let url = safeTrendyolLabelUrl(label.label);
  let r = await fetchWithTimeout(url, { redirect: "manual" });
  // Live RO labels currently use an official API-object → signed S3 redirect.
  // Validate every hop and never forward API Authorization to document storage.
  for (let hop = 0; hop < 2 && [301, 302, 303, 307, 308].includes(r.status); hop++) {
    const location = r.headers.get("location");
    if (!location) throw new TrendyolReviewError("INVALID_LABEL_REDIRECT");
    url = safeTrendyolLabelUrl(new URL(location, url).href);
    await r.body?.cancel();
    r = await fetchWithTimeout(url, { redirect: "manual" });
  }
  if (!r.ok) throw new TrendyolReviewError("PROVIDER_LABEL_UNAVAILABLE");
  const reader = r.body?.getReader();
  if (!reader) throw new TrendyolReviewError("EMPTY_LABEL");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, 15000);
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 5_000_000) {
        await reader.cancel();
        throw new TrendyolReviewError("LABEL_TOO_LARGE");
      }
      chunks.push(item.value);
    }
  } finally {
    clearTimeout(timer);
  }
  if (timedOut) throw new TrendyolReviewError("LABEL_DOWNLOAD_TIMEOUT");
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new TrendyolReviewError("INVALID_PROVIDER_LABEL");
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Trendyol-FAN-${packageId}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
export async function trendyolPrintPreview(
  env: CommerceEnv,
  orderId: string,
  kind: "invoice" | "packing",
) {
  const row = await env.DB.prepare(
    "SELECT snapshot_json FROM marketplace_order_sources WHERE order_id=?1 AND provider='trendyol'",
  )
    .bind(orderId)
    .first<{ snapshot_json: string }>();
  if (!row) throw new TrendyolReviewError("ORDER_NOT_FOUND");
  const packages = JSON.parse(row.snapshot_json) as TrendyolPackage[];
  const items = (
    await env.DB.prepare(
      "SELECT product_name,sku,quantity,line_subtotal_bani,line_discount_bani,line_total_bani FROM order_items WHERE order_id=?1 ORDER BY id",
    )
      .bind(orderId)
      .all<Record<string, string | number>>()
  ).results;
  const company = await env.DB.prepare(
    "SELECT legal_name AS name,tax_id FROM legal_entities WHERE id='legal_entity_main'",
  ).first<{ name: string; tax_id: string }>();
  const first = packages[0],
    gross = items.reduce((n, l) => n + Number(l.line_subtotal_bani), 0),
    discount = items.reduce((n, l) => n + Number(l.line_discount_bani), 0),
    total = items.reduce((n, l) => n + Number(l.line_total_bani), 0);
  const invoice = kind === "invoice";
  const html = `<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${invoice ? "Previzualizare factură" : "Fișă colet"} Trendyol</title><style>body{font:16px system-ui;color:#18202c;max-width:850px;margin:40px auto;padding:24px}h1{font-size:26px}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{border-bottom:1px solid #ccd3da;padding:12px;text-align:left}aside{padding:16px;background:#fff4cf;border:1px solid #dec686}small{color:#465363}.code{font:700 23px ui-monospace;letter-spacing:2px}@media print{body{margin:0;padding:12mm}.instructions{display:none}}</style><body><h1>${invoice ? "Previzualizare factură — neînregistrată fiscal" : "Fișă de pregătire colet — Trendyol"}</h1><aside>${invoice ? "Acesta NU este un document fiscal. Nu are număr de factură și nu consumă o serie. Emite factura numai din Facturare, după verificarea datelor." : "Eticheta oficială FAN Courier se descarcă separat din platformă. Acest document ajută pregătirea și nu generează un AWB."}</aside><p class="instructions">Pentru tipărire folosește meniul browserului sau Ctrl/Cmd+P.</p><p><strong>${escape(company?.name || "Cutiuța Magică")}</strong> · CUI ${escape(company?.tax_id)}</p><p>Comandă Trendyol: <strong>${escape(first.orderNumber)}</strong></p><p>Client: ${escape(first.customerName || first.billing.name)}${invoice ? `<br>${escape(first.billing.line1)} ${escape(first.billing.line2)}<br>${escape(first.billing.city)}, ${escape(first.billing.county)}, ${escape(first.billing.postalCode)}` : ""}</p><table><thead><tr><th>Produs / SKU</th><th>Buc.</th>${invoice ? "<th>Valoare</th><th>Reducere</th><th>Total</th>" : ""}</tr></thead><tbody>${items.map((l) => `<tr><td>${escape(l.product_name)}<br><small>${escape(l.sku)}</small></td><td>${escape(l.quantity)}</td>${invoice ? `<td>${money(Number(l.line_subtotal_bani))}</td><td>${money(Number(l.line_discount_bani))}</td><td>${money(Number(l.line_total_bani))}</td>` : ""}</tr>`).join("")}</tbody></table>${invoice ? `<p>Valoare înainte de reduceri: ${money(gross)}<br>Reduceri: ${money(discount)}</p><h2>Total de facturat: ${money(total)}</h2><p>Valorile sunt cele ale comenzii externe, nu prețul curent al catalogului. Comisionul și viramentul Trendyol se reconciliază separat.</p>` : ""}${packages.map((p) => `<section><h2>Colet ${escape(p.id)}</h2><p>Transport: ${escape(p.carrier === "FANEX" ? "FAN Courier" : p.carrier)} · gestionat de Trendyol</p><p>Cod de expediere / urmărire:</p><p class="code">${escape(p.cargoNumber || "În așteptarea platformei")}</p><p>Nr. expediere: ${escape(p.shipmentNumber)}</p>${!invoice ? `<p>${p.lines.map((l) => `${escape(l.sku)} · cod bare ${escape(l.barcode)} · ${l.quantity} buc.`).join("<br>")}</p>` : ""}</section>`).join("")}<small>Document intern privat. Starea transportului și documentele oficiale rămân cele confirmate de Trendyol.</small></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}
