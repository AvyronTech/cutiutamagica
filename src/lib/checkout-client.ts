import type { WebsiteOrderPublicResult } from "./order-contracts";
export const pendingPaymentKey = "cutiuta:pending-payment:v1";
export type PendingPayment = {
  order: WebsiteOrderPublicResult;
  items: Array<{ id: string; qty: number }>;
};
export async function openSecureCheckout(order: WebsiteOrderPublicResult) {
  const response = await fetch("/api/v1/payments/checkout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: order.orderId, publicToken: order.publicToken }),
  });
  const result = (await response.json()) as {
    data?: { checkoutUrl: string };
    error?: { message: string };
  };
  if (!response.ok || !result.data)
    throw new Error(result.error?.message ?? "Nu am putut deschide plata. Comanda este păstrată.");
  const url = new URL(result.data.checkoutUrl);
  if (
    url.protocol !== "https:" ||
    !["checkout.stripe.com", "checkout.revolut.com", "sandbox-checkout.revolut.com"].includes(
      url.hostname,
    )
  )
    throw new Error("Pagina de plată nu este disponibilă.");
  window.location.assign(url.href);
}
