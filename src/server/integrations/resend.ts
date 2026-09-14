import {
  fetchWithTimeout,
  logProviderOperation,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(
  env: CommerceEnv,
  input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
    entityType: string;
    entityId: string;
  },
): Promise<void> {
  const apiKey = requiredSecret(env.RESEND_API_KEY, "RESEND_API_KEY");
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: "Cutiuța Magică <comenzi@cutiutamagica.eu>",
      to: [input.to],
      reply_to: "cutiutamagica@gmail.com",
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: [{ name: "category", value: input.entityType }],
    }),
  });
  const result = (await response.json().catch(() => null)) as {
    id?: string;
    message?: string;
  } | null;
  await logProviderOperation(env.DB, {
    provider: "resend",
    operationType: "email.send",
    entityType: input.entityType,
    entityId: input.entityId,
    idempotencyKey: input.idempotencyKey,
    environment,
    status: response.ok && result?.id ? "succeeded" : "failed",
    externalId: result?.id ?? null,
    responseCode: response.status,
    responseSummary: result?.id ? { emailId: result.id } : {},
    errorCode: response.ok ? null : "RESEND_SEND_FAILED",
    errorMessage: response.ok ? null : result?.message || `HTTP ${response.status}`,
  });
  if (!response.ok) throw new Error(result?.message || `Resend HTTP ${response.status}`);
}

export async function sendOrderConfirmation(env: CommerceEnv, orderId: string): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT order_number, customer_name, customer_email, total_bani, currency
     FROM orders WHERE id = ?1`,
  )
    .bind(orderId)
    .first<{
      order_number: string;
      customer_name: string;
      customer_email: string | null;
      total_bani: number;
      currency: string;
    }>();
  if (!row?.customer_email) return;
  const total = (row.total_bani / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: row.currency,
  });
  const name = escapeHtml(row.customer_name);
  const number = escapeHtml(row.order_number);
  await sendEmail(env, {
    to: row.customer_email,
    subject: `Am primit comanda ${row.order_number}`,
    idempotencyKey: `order-confirmation/${orderId}`,
    entityType: "order",
    entityId: orderId,
    text: `Bună, ${row.customer_name}. Am primit comanda ${row.order_number}, în valoare de ${total}. Revenim cu confirmarea livrării.`,
    html: `<div style="font-family:system-ui;color:#3c2d24;max-width:600px;margin:auto"><h1 style="font-family:Georgia,serif">Comanda ta a intrat în poveste</h1><p>Bună, ${name}.</p><p>Am primit comanda <strong>${number}</strong>, în valoare de <strong>${escapeHtml(total)}</strong>.</p><p>Revenim cu confirmarea livrării și următorii pași.</p><p style="color:#77665c">Cutiuța Magică</p></div>`,
  });
}

export async function sendReturnAcknowledgement(
  env: CommerceEnv,
  input: { returnId: string; returnNumber: string; customerName: string; email: string },
): Promise<void> {
  await sendEmail(env, {
    to: input.email,
    subject: `Cererea de retur ${input.returnNumber} a fost înregistrată`,
    idempotencyKey: `return-ack/${input.returnId}`,
    entityType: "return",
    entityId: input.returnId,
    text: `Bună, ${input.customerName}. Cererea ${input.returnNumber} a fost înregistrată și va fi verificată.`,
    html: `<div style="font-family:system-ui;color:#3c2d24;max-width:600px;margin:auto"><h1 style="font-family:Georgia,serif">Cererea a ajuns la noi</h1><p>Bună, ${escapeHtml(input.customerName)}.</p><p>Cererea <strong>${escapeHtml(input.returnNumber)}</strong> a fost înregistrată. O verificăm și revenim cu pașii de expediere sau remediere.</p><p style="color:#77665c">Cutiuța Magică</p></div>`,
  });
}
