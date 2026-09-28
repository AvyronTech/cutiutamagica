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

export async function sendOrderOwnerNotification(env: CommerceEnv, orderId: string): Promise<void> {
  const [settings, order, items] = await Promise.all([
    getEmailSettings(env.DB),
    env.DB.prepare(
      `SELECT o.order_number, o.customer_name, o.customer_email, o.customer_phone_e164,
              o.customer_note, o.payment_method_requested, o.shipping_option_requested,
              o.subtotal_bani, o.discount_bani, o.shipping_bani, o.total_bani, o.currency,
              a.line1, a.city, a.county, a.postal_code
       FROM orders o
       LEFT JOIN order_addresses a ON a.order_id = o.id AND a.address_type = 'shipping'
       WHERE o.id = ?1`,
    )
      .bind(orderId)
      .first<{
        order_number: string;
        customer_name: string;
        customer_email: string | null;
        customer_phone_e164: string | null;
        customer_note: string | null;
        payment_method_requested: string;
        shipping_option_requested: string;
        subtotal_bani: number;
        discount_bani: number;
        shipping_bani: number;
        total_bani: number;
        currency: string;
        line1: string | null;
        city: string | null;
        county: string | null;
        postal_code: string | null;
      }>(),
    env.DB.prepare(
      `SELECT product_name, variant_name, melody_name, quantity, line_total_bani
       FROM order_items WHERE order_id = ?1 ORDER BY created_at, id`,
    )
      .bind(orderId)
      .all<{
        product_name: string;
        variant_name: string | null;
        melody_name: string | null;
        quantity: number;
        line_total_bani: number;
      }>(),
  ]);
  if (!order) throw new Error("Comanda pentru notificarea internă nu a fost găsită.");

  const money = (bani: number) =>
    (bani / 100).toLocaleString("ro-RO", { style: "currency", currency: order.currency });
  const itemLines = items.results.map(
    (item) =>
      `• ${item.quantity} × ${item.product_name}${item.variant_name ? ` — ${item.variant_name}` : ""}${item.melody_name ? ` (${item.melody_name})` : ""}: ${money(item.line_total_bani)}`,
  );
  const address = [order.line1, order.city, order.county, order.postal_code]
    .filter(Boolean)
    .join(", ");
  const text = [
    `Comandă nouă ${order.order_number}`,
    "",
    ...itemLines,
    "",
    `Subtotal: ${money(order.subtotal_bani)}`,
    ...(order.discount_bani > 0 ? [`Reducere: -${money(order.discount_bani)}`] : []),
    `Livrare: ${money(order.shipping_bani)}`,
    `Total: ${money(order.total_bani)}`,
    "",
    `Client: ${order.customer_name}`,
    `Telefon: ${order.customer_phone_e164 || "—"}`,
    `E-mail: ${order.customer_email || "—"}`,
    `Adresă: ${address || "de confirmat"}`,
    `Plată: ${order.payment_method_requested}`,
    `Livrare: ${order.shipping_option_requested}`,
    ...(order.customer_note ? [`Observații: ${order.customer_note}`] : []),
    "",
    "Comanda este disponibilă și în panoul intern Cutiuța Magică.",
  ].join("\n");

  await sendEmail(env, {
    to: settings.orderNotificationEmail,
    channel: "orders",
    subject: `Comandă nouă ${order.order_number} · ${money(order.total_bani)}`,
    idempotencyKey: `order-owner-notification/${orderId}`,
    entityType: "order_internal_notification",
    entityId: orderId,
    text,
    html: emailTextToHtml(text),
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
