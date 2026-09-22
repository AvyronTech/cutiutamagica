import {
  fetchWithTimeout,
  logProviderOperation,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { credential } from "@/server/services/growth-settings";
import {
  emailTextToHtml,
  fromAddress,
  getEmailSettings,
  getEmailTemplate,
  renderEmailTemplate,
} from "@/server/services/email-center";
import type { EmailChannel } from "@/lib/email-contracts";

export async function sendEmail(
  env: CommerceEnv,
  input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    channel?: EmailChannel;
    idempotencyKey: string;
    entityType: string;
    entityId: string;
  },
): Promise<void> {
  const apiKey = requiredSecret((await credential(env, "resend")) ?? undefined, "RESEND_API_KEY");
  const settings = await getEmailSettings(env.DB);
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: `${settings.senderName} <${fromAddress(settings, input.channel ?? "default")}>`,
      to: [input.to],
      reply_to: settings.replyToEmail,
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
  if (!response.ok || !result?.id)
    throw new Error(`Resend HTTP ${response.status}: trimitere neconfirmată`);
}

export async function sendOrderConfirmation(env: CommerceEnv, orderId: string): Promise<void> {
  const [settings, template] = await Promise.all([
    getEmailSettings(env.DB),
    getEmailTemplate(env.DB, "order_confirmation"),
  ]);
  if (!settings.customerEmailsEnabled || !template?.enabled) return;
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
  const rendered = renderEmailTemplate(template, {
    customer_name: row.customer_name,
    order_number: row.order_number,
    total,
  });
  await sendEmail(env, {
    to: row.customer_email,
    channel: "orders",
    subject: rendered.subject,
    idempotencyKey: `order-confirmation/${orderId}`,
    entityType: "order",
    entityId: orderId,
    text: rendered.text,
    html: emailTextToHtml(rendered.text),
  });
}

export async function sendReturnAcknowledgement(
  env: CommerceEnv,
  input: { returnId: string; returnNumber: string; customerName: string; email: string },
): Promise<void> {
  const [settings, template] = await Promise.all([
    getEmailSettings(env.DB),
    getEmailTemplate(env.DB, "return_acknowledgement"),
  ]);
  if (!settings.customerEmailsEnabled || !template?.enabled) return;
  const rendered = renderEmailTemplate(template, {
    customer_name: input.customerName,
    return_number: input.returnNumber,
  });
  await sendEmail(env, {
    to: input.email,
    channel: "returns",
    subject: rendered.subject,
    idempotencyKey: `return-ack/${input.returnId}`,
    entityType: "return",
    entityId: input.returnId,
    text: rendered.text,
    html: emailTextToHtml(rendered.text),
  });
}
