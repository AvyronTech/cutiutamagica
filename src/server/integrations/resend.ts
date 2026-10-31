import {
  fetchWithTimeout,
  logProviderOperation,
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
  resendOnly?: boolean;
  idempotencyKey: string;
  entityType: string;
  entityId: string;
};

class SafeTransportFallback extends Error {}
export class EmailDeliveryUncertainError extends Error {
  constructor() {
    super("Starea trimiterii este incertă. Verifică furnizorul înainte de retrimitere.");
    this.name = "EmailDeliveryUncertainError";
  }
}

export function mayFallbackFromCloudflare(error: unknown): boolean {
  return (
    error instanceof SafeTransportFallback ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "E_RECIPIENT_NOT_ALLOWED")
  );
}

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
  if (row?.sent === 1) return true;
  const uncertain = await env.DB.prepare(
    `SELECT 1 AS uncertain FROM provider_operations
     WHERE provider IN ('cloudflare_email','resend') AND operation_type='email.send'
       AND idempotency_key=?1 AND error_code='EMAIL_DELIVERY_UNCERTAIN' LIMIT 1`,
  )
    .bind(idempotencyKey)
    .first<{ uncertain: number }>();
  if (uncertain) throw new EmailDeliveryUncertainError();
  return false;
}

export async function hasEmailTransport(env: CommerceEnv): Promise<boolean> {
  if (env.EMAIL) return true;
  return Boolean(await credential(env, "resend"));
}

export async function sendEmail(env: CommerceEnv, input: SendEmailInput): Promise<void> {
  const settings = await getEmailSettings(env.DB);
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  if (await wasAlreadySent(env, input.idempotencyKey)) return;

  const cloudflare = async () => {
    if (!env.EMAIL) throw new SafeTransportFallback("Cloudflare Email Sending nu este configurat.");
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
      return true;
    } catch (error) {
      const detail = emailError(error);
      await logProviderOperation(env.DB, {
        provider: "cloudflare_email",
        operationType: "email.send",
        entityType: input.entityType,
        entityId: input.entityId,
        idempotencyKey: input.idempotencyKey,
        environment,
        status: "failed",
        responseSummary: {},
        errorCode: mayFallbackFromCloudflare(error) ? detail.code : "EMAIL_DELIVERY_UNCERTAIN",
        errorMessage: detail.message,
      });
      // Only a definitive recipient-policy rejection permits a second provider.
      // A timeout or an unknown result could mean that the first provider accepted it.
      if (!mayFallbackFromCloudflare(error)) throw new EmailDeliveryUncertainError();
      throw error instanceof Error ? error : new Error(detail.message);
    }
  };

  const resend = async () => {
    const apiKey = await credential(env, "resend");
    if (!apiKey) throw new SafeTransportFallback("Resend nu are o cheie configurată.");
    const usage = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN substr(created_at,1,10)=substr(strftime('%Y-%m-%dT%H:%M:%fZ','now'),1,10)
           THEN 1 ELSE 0 END) AS today,
         COUNT(*) AS month
       FROM provider_operations
       WHERE provider='resend' AND operation_type='email.send' AND status='succeeded'
         AND substr(created_at,1,7)=substr(strftime('%Y-%m-%dT%H:%M:%fZ','now'),1,7)`,
    ).first<{ today: number | null; month: number }>();
    // Keep a small buffer below Resend Free (100/day, 3,000/month). The
    // provider's disabled pay-as-you-go setting remains the final cost gate.
    if (Number(usage?.today ?? 0) >= 95 || Number(usage?.month ?? 0) >= 2900)
      throw new Error("Limita gratuită Resend este aproape atinsă; trimiterea a fost amânată.");
    let response: Response;
    try {
      response = await fetchWithTimeout("https://api.resend.com/emails", {
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
    } catch {
      await logProviderOperation(env.DB, {
        provider: "resend",
        operationType: "email.send",
        entityType: input.entityType,
        entityId: input.entityId,
        idempotencyKey: input.idempotencyKey,
        environment,
        status: "failed",
        errorCode: "EMAIL_DELIVERY_UNCERTAIN",
        errorMessage: "Răspunsul Resend nu a fost primit; reconciliere manuală necesară.",
      });
      throw new EmailDeliveryUncertainError();
    }
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
      errorCode: response.ok
        ? result?.id
          ? null
          : "EMAIL_DELIVERY_UNCERTAIN"
        : "RESEND_SEND_FAILED",
      errorMessage: response.ok
        ? result?.id
          ? null
          : "Resend a răspuns fără identificator de mesaj."
        : result?.message || `HTTP ${response.status}`,
    });
    if (response.ok && !result?.id) throw new EmailDeliveryUncertainError();
    if (!response.ok || !result?.id)
      throw new Error(`Resend HTTP ${response.status}: trimitere neconfirmată`);
  };

  if (input.resendOnly || settings.provider === "resend") {
    try {
      await resend();
    } catch (error) {
      if (input.resendOnly || !(error instanceof SafeTransportFallback)) throw error;
      await cloudflare();
    }
    return;
  }
  try {
    await cloudflare();
  } catch (error) {
    if (!mayFallbackFromCloudflare(error)) throw error;
    await resend();
  }
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
  const accepted = await env.DB.prepare(
    `SELECT 1 AS accepted FROM orders WHERE id=?1 AND order_status!='cancelled'
     AND (payment_method_requested!='card' OR (payment_status='paid' AND paid_bani=total_bani))`,
  )
    .bind(orderId)
    .first<{ accepted: number }>();
  if (!accepted) return;
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
  const [settings, template, order, items] = await Promise.all([
    getEmailSettings(env.DB),
    getEmailTemplate(env.DB, "order_owner_notification"),
    env.DB.prepare(
      `SELECT o.order_number, o.customer_name, o.customer_email, o.customer_phone_e164,
              o.customer_note, o.payment_method_requested, o.shipping_option_requested,
              o.payment_status, o.subtotal_bani, o.discount_bani, o.shipping_bani,
              o.total_bani, o.currency, a.line1, a.city, a.county, a.postal_code,
              q.courier_name, q.locker_name, q.locker_id, q.delivery_estimate
       FROM orders o
       LEFT JOIN order_addresses a ON a.order_id = o.id AND a.address_type = 'shipping'
       LEFT JOIN shipping_quotes q ON q.id = o.shipping_quote_id
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
        payment_status: string;
        subtotal_bani: number;
        discount_bani: number;
        shipping_bani: number;
        total_bani: number;
        currency: string;
        line1: string | null;
        city: string | null;
        county: string | null;
        postal_code: string | null;
        courier_name: string | null;
        locker_name: string | null;
        locker_id: string | null;
        delivery_estimate: string | null;
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
  const accepted = await env.DB.prepare(
    `SELECT 1 AS accepted FROM orders WHERE id=?1 AND order_status!='cancelled'
     AND (payment_method_requested!='card' OR (payment_status='paid' AND paid_bani=total_bani))`,
  )
    .bind(orderId)
    .first<{ accepted: number }>();
  if (!accepted) return;

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
    `Stare plată: ${order.payment_status}`,
    `Livrare: ${order.shipping_option_requested}`,
    ...(order.courier_name ? [`Curier: ${order.courier_name}`] : []),
    ...(order.locker_id
      ? [`Punct Easybox: ${order.locker_name || order.locker_id} (${order.locker_id})`]
      : []),
    ...(order.delivery_estimate ? [`Estimare curier: ${order.delivery_estimate}`] : []),
    ...(order.customer_note ? [`Observații: ${order.customer_note}`] : []),
    "",
    "Comanda este disponibilă și în panoul intern Cutiuța Magică.",
  ].join("\n");

  if (!template?.enabled) return;
  const rendered = renderEmailTemplate(template, {
    order_number: order.order_number,
    total: money(order.total_bani),
    details: text,
  });
  await sendEmail(env, {
    to: settings.orderNotificationEmail,
    channel: "orders",
    subject: rendered.subject,
    idempotencyKey: `order-owner-notification/${orderId}`,
    entityType: "order_internal_notification",
    entityId: orderId,
    text: rendered.text,
    html: emailTextToHtml(rendered.text),
  });
}

export async function sendOrderShippedNotification(
  env: CommerceEnv,
  orderId: string,
): Promise<void> {
  const [settings, template, order] = await Promise.all([
    getEmailSettings(env.DB),
    getEmailTemplate(env.DB, "order_shipped"),
    env.DB.prepare(
      `SELECT order_number,customer_name,customer_email,fulfillment_status,
      payment_method_requested,payment_status,paid_bani,total_bani
      FROM orders WHERE id=?1`,
    )
      .bind(orderId)
      .first<{
        order_number: string;
        customer_name: string;
        customer_email: string | null;
        fulfillment_status: string;
        payment_method_requested: string;
        payment_status: string;
        paid_bani: number;
        total_bani: number;
      }>(),
  ]);
  if (
    !settings.customerEmailsEnabled ||
    !template?.enabled ||
    !order?.customer_email ||
    order.fulfillment_status !== "shipped" ||
    (order.payment_method_requested === "card" &&
      (order.payment_status !== "paid" || order.paid_bani !== order.total_bani))
  )
    return;
  const rendered = renderEmailTemplate(template, {
    customer_name: order.customer_name,
    order_number: order.order_number,
  });
  await sendEmail(env, {
    to: order.customer_email,
    channel: "orders",
    subject: rendered.subject,
    idempotencyKey: `order-shipped/${orderId}`,
    entityType: "order_shipped",
    entityId: orderId,
    text: rendered.text,
    html: emailTextToHtml(rendered.text),
  });
}

export async function sendReturnOwnerNotification(
  env: CommerceEnv,
  returnId: string,
): Promise<void> {
  const [settings, template, row] = await Promise.all([
    getEmailSettings(env.DB),
    getEmailTemplate(env.DB, "return_owner_notification"),
    env.DB.prepare(
      `SELECT rr.return_number,rr.request_type,rr.customer_name,o.order_number
      FROM return_requests rr JOIN orders o ON o.id=rr.order_id WHERE rr.id=?1`,
    )
      .bind(returnId)
      .first<{
        return_number: string;
        request_type: string;
        customer_name: string;
        order_number: string;
      }>(),
  ]);
  if (!row || !template?.enabled) return;
  const rendered = renderEmailTemplate(template, {
    return_number: row.return_number,
    order_number: row.order_number,
    request_type: row.request_type,
    customer_name: row.customer_name,
  });
  await sendEmail(env, {
    to: settings.orderNotificationEmail,
    channel: "returns",
    subject: rendered.subject,
    idempotencyKey: `return-owner-notification/${returnId}`,
    entityType: "return_internal_notification",
    entityId: returnId,
    text: rendered.text,
    html: emailTextToHtml(rendered.text),
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

export async function sendReturnAcknowledgementForId(
  env: CommerceEnv,
  returnId: string,
): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT return_number,customer_name,customer_email FROM return_requests WHERE id=?1`,
  )
    .bind(returnId)
    .first<{
      return_number: string;
      customer_name: string;
      customer_email: string;
    }>();
  if (!row) throw new Error("Cererea de retur nu a fost găsită.");
  await sendReturnAcknowledgement(env, {
    returnId,
    returnNumber: row.return_number,
    customerName: row.customer_name,
    email: row.customer_email,
  });
}
