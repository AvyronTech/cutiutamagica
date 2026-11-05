import { SITE_ORIGIN } from "./seo-head";

export type PublicShippingPolicy = {
  country: "RO";
  currency: "RON";
  freeOverRon: number | null;
  easybox: boolean;
};

export function freeShippingLabel(policy: PublicShippingPolicy | null) {
  if (policy?.freeOverRon == null) return null;
  return policy.freeOverRon === 0
    ? "Transport gratuit în România"
    : `Transport gratuit de la ${policy.freeOverRon.toLocaleString("ro-RO")} RON`;
}

export function shippingServices(policy: PublicShippingPolicy | null) {
  if (policy?.freeOverRon == null) return [];
  const methods = [
    { id: "ro-curier", name: "Curier la adresă", fulfillment: "FulfillmentTypeDelivery" },
    ...(policy.easybox
      ? [
          {
            id: "ro-easybox",
            name: "SAMEDAY easybox",
            fulfillment: "FulfillmentTypeCollectionPoint",
          },
        ]
      : []),
  ];
  return methods.map((method) => ({
    "@type": "ShippingService",
    "@id": `${SITE_ORIGIN}/livrare#${method.id}`,
    name: `${method.name} · ${freeShippingLabel(policy)}`,
    fulfillmentType: `https://schema.org/${method.fulfillment}`,
    shippingConditions: {
      "@type": "ShippingConditions",
      shippingDestination: { "@type": "DefinedRegion", addressCountry: policy.country },
      orderValue: {
        "@type": "MonetaryAmount",
        minValue: policy.freeOverRon,
        currency: policy.currency,
      },
      shippingRate: { "@type": "MonetaryAmount", value: 0, currency: policy.currency },
    },
  }));
}

export function offerShippingDetails(policy: PublicShippingPolicy | null) {
  const services = shippingServices(policy);
  return services.length
    ? services.map((service) => ({
        "@type": "OfferShippingDetails",
        hasShippingService: { "@id": service["@id"] },
      }))
    : undefined;
}
