export type PageStoryScene =
  | "home"
  | "catalog"
  | "product"
  | "checkout"
  | "personalize"
  | "delivery"
  | "workshop"
  | "gifts"
  | "rewards"
  | "account"
  | "care"
  | "legal";

export type PageStoryProfile = {
  scene: PageStoryScene;
  eyebrow: string;
  title: string;
  detail: string;
  symbol: string;
  accent: string;
  glow: string;
};

const profiles: Record<PageStoryScene, PageStoryProfile> = {
  home: {
    scene: "home",
    eyebrow: "Se deschide povestea",
    title: "Acasă, în atelierul magic",
    detail: "O rotire. O melodie. O amintire.",
    symbol: "✦",
    accent: "#e7bd76",
    glow: "#9c572f",
  },
  catalog: {
    scene: "catalog",
    eyebrow: "Se aprind vitrinele",
    title: "Cutiuțele își caută povestea",
    detail: "Colecția se așază în lumină.",
    symbol: "◫",
    accent: "#e7bd76",
    glow: "#70432a",
  },
  product: {
    scene: "product",
    eyebrow: "Privire de aproape",
    title: "O cutiuță urcă pe piedestal",
    detail: "Detaliile, melodia și lemnul prind contur.",
    symbol: "◇",
    accent: "#efcb8d",
    glow: "#765033",
  },
  checkout: {
    scene: "checkout",
    eyebrow: "Ultima verificare",
    title: "Pregătim cutiuțele alese",
    detail: "Coșul și datele tale se așază în siguranță.",
    symbol: "✓",
    accent: "#e7bd76",
    glow: "#75532d",
  },
  personalize: {
    scene: "personalize",
    eyebrow: "Atelierul tău",
    title: "Capacul devine unic",
    detail: "Culoarea, melodia și imaginea te așteaptă.",
    symbol: "✧",
    accent: "#f1c98c",
    glow: "#8b4d62",
  },
  delivery: {
    scene: "delivery",
    eyebrow: "Din atelier spre tine",
    title: "Coletul pornește la drum",
    detail: "Urmărim fiecare pas al livrării.",
    symbol: "→",
    accent: "#9ac6be",
    glow: "#315f5f",
  },
  workshop: {
    scene: "workshop",
    eyebrow: "În inima mecanismului",
    title: "Povestea se construiește piesă cu piesă",
    detail: "Lemn, alamă și o manivelă mică.",
    symbol: "⚙",
    accent: "#d9ad68",
    glow: "#68442c",
  },
  gifts: {
    scene: "gifts",
    eyebrow: "Un dar cu înțeles",
    title: "Împachetăm o idee de poveste",
    detail: "Pentru un om drag și un moment care rămâne.",
    symbol: "✦",
    accent: "#e9b9a5",
    glow: "#74424c",
  },
  rewards: {
    scene: "rewards",
    eyebrow: "Se aprinde o stea",
    title: "Momentele tale devin Magic Stars",
    detail: "O poveste. O stea. Fără calcule complicate.",
    symbol: "✦",
    accent: "#f3d18d",
    glow: "#6e4f8f",
  },
  account: {
    scene: "account",
    eyebrow: "Spațiul tău",
    title: "Se deschide sertarul cu amintiri",
    detail: "Cererile și preferințele tale, într-un singur loc.",
    symbol: "⌂",
    accent: "#a9c7bd",
    glow: "#365552",
  },
  care: {
    scene: "care",
    eyebrow: "Grijă după deschidere",
    title: "Punem lucrurile în ordine",
    detail: "Răspunsuri clare pentru retur și garanție.",
    symbol: "↺",
    accent: "#b8ccb0",
    glow: "#466044",
  },
  legal: {
    scene: "legal",
    eyebrow: "Informații clare",
    title: "Așezăm fiecare detaliu la locul lui",
    detail: "Condiții și confidențialitate, fără litere mici ascunse.",
    symbol: "§",
    accent: "#c8b794",
    glow: "#575044",
  },
};

export function isPublicStoryPath(pathname: string) {
  return !(
    pathname.startsWith("/admin") ||
    pathname === "/auth" ||
    pathname.startsWith("/api/") ||
    pathname === "/sitemap.xml"
  );
}

export function pageStoryProfile(pathname: string): PageStoryProfile {
  if (pathname === "/") return profiles.home;
  if (pathname === "/produse") return profiles.catalog;
  if (pathname.startsWith("/produs/")) return profiles.product;
  if (pathname === "/comanda") return profiles.checkout;
  if (pathname === "/personalizeaza") return profiles.personalize;
  if (pathname === "/livrare") return profiles.delivery;
  if (pathname === "/despre-cutiuta" || pathname === "/despre-noi" || pathname === "/poveste")
    return profiles.workshop;
  if (pathname === "/cadouri" || pathname.startsWith("/cadouri/")) return profiles.gifts;
  if (pathname === "/ghid-cadouri-personalizate") return profiles.gifts;
  if (pathname === "/magic-rewards") return profiles.rewards;
  if (pathname === "/cont") return profiles.account;
  if (pathname === "/retur") return profiles.care;
  if (pathname === "/termeni-de-utilizare" || pathname === "/politica-de-confidentialitate")
    return profiles.legal;
  return profiles.home;
}
