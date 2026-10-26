import { giftGuides } from "@/data/gift-guides";
import { productPath } from "@/lib/product-url";
import { SITE_ORIGIN } from "@/lib/seo-head";
import type { CatalogProduct } from "@/server/db/catalog.repository";

export type LlmsProduct = Pick<
  CatalogProduct,
  "slug" | "name" | "shortDescription" | "description" | "availability"
>;

function plain(value: string): string {
  return value
    .replaceAll("[", " ")
    .replaceAll("]", " ")
    .replace(/[()\r\n<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function link(label: string, path: string, description?: string): string {
  return `- [${plain(label)}](${SITE_ORIGIN}${path})${description ? `: ${plain(description)}` : ""}`;
}

export function renderLlmsTxt(products: LlmsProduct[]): string {
  const lines = [
    "# Cutiuța Magică",
    "> Magazin online din România cu cutiuțe muzicale din lemn, cu manivelă și mecanism manual. Informațiile despre preț și disponibilitate se verifică în pagina fiecărui produs.",
    "",
    "## Magazin și informații utile",
    link("Acasă", "/", "Prezentarea magazinului și a colecției."),
    link("Catalogul de cutiuțe muzicale", "/produse", "Produse și disponibilitate actuală."),
    link("Despre Cutiuța Magică", "/despre-cutiuta", "Povestea și selecția magazinului."),
    link("Despre firma vânzătoare", "/despre-noi", "Date despre operatorul magazinului."),
    link("Magic Rewards", "/magic-rewards", "Regulile programului de fidelitate."),
    link(
      "Livrare",
      "/livrare",
      "Curier la adresă și SAMEDAY easybox; oferta finală apare în checkout.",
    ),
    link("Retur", "/retur", "Condiții și pași pentru retur."),
    link("Termeni de utilizare", "/termeni-de-utilizare", "Condițiile magazinului."),
    link(
      "Politica de confidențialitate",
      "/politica-de-confidentialitate",
      "Prelucrarea datelor personale.",
    ),
    "",
    "## Ghiduri pentru alegerea cadoului",
    link("Toate ghidurile", "/cadouri", "Alegere după ocazie, destinatar și pasiune."),
    link(
      "Ghid de alegere",
      "/ghid-cadouri-personalizate",
      "Cum alegi o cutiuță după persoană și ocazie.",
    ),
    ...giftGuides.map((guide) => link(guide.title, `/cadouri/${guide.slug}`, guide.description)),
    "",
    "## Produse publicate",
    ...products.map((product) =>
      link(
        product.name,
        productPath(product.slug),
        `${product.shortDescription || product.description} ${product.availability === "available" ? "Disponibilitatea și prețul actual sunt pe pagină." : "Verifică disponibilitatea actuală pe pagină."}`,
      ),
    ),
    "",
  ];
  return lines.join("\n");
}
