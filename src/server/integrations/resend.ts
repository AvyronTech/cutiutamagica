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

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  channel?: EmailChannel;
  idempotencyKey: string;
  entityType: string;
  entityId: string;
};

function emailError(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const value = error as { code?: unknown; message?: unknown };
    return {
      code: typeof value.code === "string" ? value.code : "CLOUDFLARE_EMAIL_SEND_FAILED",
      message: typeof value.message === "string" ? value.message : "Trimiterea e-mailului a eșuat.",
    };
  }
  return { code: "CLOUDFLARE_EMAIL_SEND_FAILED", message: String(error) };
}

async function wasAlreadySent(env: CommerceEnv, idempotencyKey: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 AS sent FROM provider_operations
     WHERE provider IN ('cloudflare_email', 'resend')
       AND operation_type = 'email.send'
       AND idempotency_key = ?1
       AND status = 'succeeded'
     LIMIT 1`,
  )
    .bind(idempotencyKey)
    .first<{ sent: number }>();
  return row?.sent === 1;
}

export async function hasEmailTransport(env: CommerceEnv): Promise<boolean> {
  if (env.EMAIL) return true;
  return Boolean(await credential(env, "resend"));
}

export async function sendEmail(env: CommerceEnv, input: SendEmailInput): Promise<void> {
  const settings = await getEmailSettings(env.DB);
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  if (await wasAlreadySent(env, input.idempotencyKey)) return;

  let cloudflareFailure: Error | null = null;
  if (env.EMAIL) {
    try {
      const configuredSender = fromAddress(settings, input.channel ?? "default");
      const sender = ["contact@cutiutamagica.eu", "comenzi@cutiutamagica.eu"].includes(
        configuredSender,
      )
        ? configuredSender
        : "contact@cutiutamagica.eu";
      const result = await env.EMAIL.send({
        from: {
          name: settings.senderName,
          email: sender,
        },
        to: input.to,
        replyTo: settings.replyToEmail,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: {
          "X-Cutiuta-Entity": input.entityType,
          "X-Cutiuta-Idempotency-Key": input.idempotencyKey,
        },
      });
      await logProviderOperation(env.DB, {
        provider: "cloudflare_email",
        operationType: "email.send",
        entityType: input.entityType,
        entityId: input.entityId,
        idempotencyKey: input.idempotencyKey,
        environment,
        status: "succeeded",
        externalId: result.messageId,
        responseCode: 202,
        responseSummary: { messageId: result.messageId },
      });
      return;
    } catch (error) {
      const detail = emailError(error);
      cloudflareFailure = error instanceof Error ? error : new Error(detail.message);
      await logProviderOperation(env.DB, {
        provider: "cloudflare_email",
        operationType: "email.send",
        entityType: input.entityType,
        entityId: input.entityId,
        idempotencyKey: input.idempotencyKey,
        environment,
        status: "failed",
        responseSummary: {},
        errorCode: detail.code,
        errorMessage: detail.message,
      });
    }
  }

  const fallbackKey = await credential(env, "resend");
  if (!fallbackKey) {
    if (cloudflareFailure) throw cloudflareFailure;
    requiredSecret(undefined, "Cloudflare Email Sending sau RESEND_API_KEY");
  }
  const apiKey = fallbackKey as string;
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

export async function sendReferralInvitation(
  env: CommerceEnv,
  input: {
    orderId: string;
    email: string;
    code: string;
    expiresAt: string;
    friendRewardBani: number;
    advocateRewardBani: number;
  },
): Promise<void> {
  const settings = await getEmailSettings(env.DB);
  if (!settings.customerEmailsEnabled) return;
  const friendReward = (input.friendRewardBani / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
  });
  const advocateReward = (input.advocateRewardBani / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
  });
  const text = [
    "Ai făcut pe cineva fericit? ✨",
    "",
    `Oferă unui prieten ${friendReward} și primești și tu ${advocateReward} pentru următoarea poveste.`,
    "",
    `Codul tău de recomandare: ${input.code}`,
    `Valabil până la ${new Date(input.expiresAt).toLocaleDateString("ro-RO")}.`,
    "",
    "Recompensa ta se activează după ce comanda prietenului este livrată.",
    `${env.PUBLIC_SITE_URL}/produse`,
  ].join("\n");
  await sendEmail(env, {
    to: input.email,
    channel: "orders",
    subject: "Ai făcut pe cineva fericit? ✨",
    idempotencyKey: `referral-invitation/${input.orderId}`,
    entityType: "referral_invitation",
    entityId: input.orderId,
    text,
    html: emailTextToHtml(text),
  });
}

export async function sendReferralReward(
  env: CommerceEnv,
  input: { orderId: string; email: string; code: string; valueBani: number },
): Promise<void> {
  const settings = await getEmailSettings(env.DB);
  if (!settings.customerEmailsEnabled) return;
  const value = (input.valueBani / 100).toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
  });
  const text = [
    "Povestea recomandată de tine a ajuns cu bine ✨",
    "",
    `Ai primit ${value} pentru următoarea ta cutiuță.`,
    `Codul tău personal: ${input.code}`,
    "",
    `${env.PUBLIC_SITE_URL}/produse`,
  ].join("\n");
  await sendEmail(env, {
    to: input.email,
    channel: "orders",
    subject: `Cadoul tău de recomandare: ${value}`,
    idempotencyKey: `referral-reward/${input.orderId}`,
    entityType: "referral_reward",
    entityId: input.orderId,
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
