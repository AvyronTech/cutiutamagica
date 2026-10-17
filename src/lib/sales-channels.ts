export const salesChannelDefinitions = {
  google_merchant: {
    name: "Google Merchant Center",
    portal: "https://merchants.google.com/",
    hosts: ["merchants.google.com"],
    mode: "Feed automat din catalog",
    listingPolicy: "allowed",
    orderMode: "none",
    help: "Înregistrează sursa XML în Merchant Center. Google verifică magazinul, produsele și identificatorii înainte de afișare.",
  },
  emag: {
    name: "eMAG",
    portal: "https://marketplace.emag.ro/",
    hosts: ["marketplace.emag.ro", "www.emag.ro", "emag.ro"],
    mode: "API oficial v4.5.1 · necesită maparea categoriei",
    listingPolicy: "setup_required",
    orderMode: "official_api",
    help: "Cont seller, acces API v4.5.1, categorii, caracteristici și identificatori validați. Până la verificarea conectorului, pregătește numai ciorna/exportul din catalog.",
  },
  trendyol: {
    name: "Trendyol",
    portal: "https://partner.trendyol.com/",
    hosts: ["partner.trendyol.com", "www.trendyol.com", "trendyol.com"],
    mode: "API oficial V2 · necesită maparea categoriei",
    listingPolicy: "setup_required",
    orderMode: "official_api_v2",
    help: "Cont partener, seller ID, Product V2, Order V2 și atributele obligatorii pentru piața țintă. Endpointurile V1 nu sunt acceptate.",
  },
  okazii: {
    name: "Okazii.ro",
    portal: "https://www.okazii.ro/",
    hosts: ["www.okazii.ro", "okazii.ro"],
    mode: "Feed XML oficial · validare în portal",
    listingPolicy: "setup_required",
    orderMode: "manual_import",
    help: "Pregătește feedul XML din catalog numai după maparea categoriei, curierilor și atributelor din cont. Comenzile rămân import manual auditat până la un API oficial verificat.",
  },
  olx: {
    name: "OLX",
    portal: "https://www.olx.ro/",
    hosts: ["www.olx.ro", "olx.ro"],
    mode: "Publicare asistată · API cu acces oficial",
    listingPolicy: "setup_required",
    orderMode: "manual_import",
    help: "Contul și categoria anunțului trebuie validate. Accesul API este separat de autentificarea în portal.",
  },
  vinted: {
    name: "Vinted",
    portal: "https://www.vinted.ro/",
    hosts: ["www.vinted.ro", "vinted.ro"],
    mode: "Dezactivat · neeligibil comercial în România",
    listingPolicy: "blocked",
    orderMode: "none",
    help: "Nu publica produsele comerciale Cutiuța Magică printr-un cont standard. Vinted Pro nu este disponibil firmelor înregistrate în România la ultima verificare oficială.",
  },
} as const;
export type SalesChannelCode = keyof typeof salesChannelDefinitions;
export const salesChannelCodes = Object.keys(salesChannelDefinitions) as SalesChannelCode[];
export type SalesChannelListingPolicy =
  (typeof salesChannelDefinitions)[SalesChannelCode]["listingPolicy"];

export function channelAllowsCommercialListings(code: SalesChannelCode) {
  return salesChannelDefinitions[code].listingPolicy !== "blocked";
}

export function channelRequiresVerifiedConnector(code: SalesChannelCode) {
  return salesChannelDefinitions[code].listingPolicy === "setup_required";
}

export function validChannelUrl(code: SalesChannelCode, value: string) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (salesChannelDefinitions[code].hosts as readonly string[]).includes(u.hostname)
    );
  } catch {
    return false;
  }
}
