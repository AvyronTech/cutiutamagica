import type { WebsiteOrderInput } from "@/lib/order-contracts";
import { digestHex } from "../integrations/provider-runtime";
export async function shippingFingerprint(
  input: Pick<WebsiteOrderInput, "customer" | "items" | "paymentMethod" | "shippingOption">,
  totalBani: number,
) {
  const items = new Map<string, number>();
  for (const item of input.items)
    items.set(item.productId, (items.get(item.productId) ?? 0) + item.quantity);
  const c = input.customer;
  return digestHex(
    "SHA-256",
    JSON.stringify({
      items: [...items].sort(([a], [b]) => a.localeCompare(b)),
      totalBani,
      customer: [c.name, c.email, c.phone, c.address, c.city, c.county, c.postalCode].map((v) =>
        v.trim().toLowerCase(),
      ),
      payment: input.paymentMethod,
      shipping: input.shippingOption,
    }),
  );
}
