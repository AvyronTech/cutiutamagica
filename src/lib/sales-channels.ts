export const salesChannelDefinitions = {
  google_merchant: {
    name: "Google Merchant Center",
    portal: "https://merchants.google.com/",
    hosts: ["merchants.google.com"],
    mode: "Feed automat din catalog",
    help: "Înregistrează sursa XML în Merchant Center. Google verifică magazinul, produsele și identificatorii înainte de afișare.",
  },
  emag: {
    name: "eMAG",
    portal: "https://marketplace.emag.ro/",
    hosts: ["marketplace.emag.ro", "www.emag.ro", "emag.ro"],
    mode: "API oficial · necesită maparea categoriei",
    help: "Cont seller, acces API, categorii, caracteristici și identificatori validați. Până la conectare, pregătește anunțul și publică din portal.",
  },
  trendyol: {
    name: "Trendyol",
    portal: "https://partner.trendyol.com/",
    hosts: ["partner.trendyol.com", "www.trendyol.com", "trendyol.com"],
    mode: "API oficial V2 · necesită maparea categoriei",
    help: "Cont partener, seller ID, acces API V2 și atributele obligatorii pentru piața țintă.",
  },
  okazii: {
    name: "Okazii.ro",
    portal: "https://www.okazii.ro/",
    hosts: ["www.okazii.ro", "okazii.ro"],
    mode: "Publicare asistată",
    help: "Pregătește textul, fotografiile și prețul din catalog. Conectarea automată necesită acces oficial oferit contului.",
  },
  olx: {
    name: "OLX",
    portal: "https://www.olx.ro/",
    hosts: ["www.olx.ro", "olx.ro"],
    mode: "Publicare asistată · API cu acces oficial",
    help: "Contul și categoria anunțului trebuie validate. Accesul API este separat de autentificarea în portal.",
  },
  vinted: {
    name: "Vinted",
    portal: "https://www.vinted.ro/",
    hosts: ["www.vinted.ro", "vinted.ro"],
    mode: "Publicare manuală asistată",
    help: "Copiază anunțul, verifică regulile contului și publică în Vinted. Nu folosim automatizări neoficiale sau parola contului.",
  },
} as const;
export type SalesChannelCode = keyof typeof salesChannelDefinitions;
export const salesChannelCodes = Object.keys(salesChannelDefinitions) as SalesChannelCode[];
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
