import {
  checkoutSettingsSchema,
  type CheckoutOption,
  type PaymentProvider,
} from "@/lib/checkout-settings";
import { credential, readSetting } from "./growth-settings";
import type { CommerceEnv } from "../integrations/provider-runtime";
export function paymentEnvironment(env: CommerceEnv) {
  return env.APP_ENV === "production" ? "production" : "sandbox";
}
export const adapterReady: Record<PaymentProvider, boolean> = {
  stripe: true,
  revolut_pay: true,
  netopia: false,
};
export async function checkoutReadiness(env: CommerceEnv) {
  const settings = await readSetting(env.DB, "commerce.checkout", checkoutSettingsSchema);
  const environment = paymentEnvironment(env);
  const [stripe, stripeWebhook, revolut, revolutWebhook, netopia, netopiaKey] = await Promise.all([
    credential(env, "stripe"),
    credential(env, "stripe_webhook"),
    credential(env, "revolut_merchant"),
    credential(env, "revolut_merchant_webhook"),
    credential(env, "netopia"),
    credential(env, "netopia_public_key"),
  ]);
  const configured = {
    stripe: Boolean(
      stripe &&
      stripeWebhook &&
      stripe.startsWith(environment === "production" ? "sk_live_" : "sk_test_"),
    ),
    revolut_pay: Boolean(revolut && revolutWebhook),
    netopia: Boolean(
      netopia && netopiaKey && settings.netopiaPosSignature && settings.netopiaActiveKey,
    ),
  };
  const options: CheckoutOption[] = [];
  const definitions: CheckoutOption[] = [
    { id: "stripe", label: "Card bancar", description: "Plată securizată prin Stripe" },
    {
      id: "revolut_pay",
      label: "Revolut Pay",
      description: "Continuă în pagina securizată Revolut",
    },
    {
      id: "netopia",
      label: "Card prin NETOPIA",
      description: "Plată securizată prin NETOPIA Payments",
    },
  ];
  for (const option of definitions) {
    const config = settings[option.id];
    if (
      adapterReady[option.id] &&
      configured[option.id] &&
      config.enabled &&
      config.environment === environment &&
      config.acceptanceTestReference
    )
      options.push(option);
  }
  return { settings, environment, configured, options, adapterReady };
}
