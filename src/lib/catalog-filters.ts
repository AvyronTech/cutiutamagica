import { isAvailable, type Product } from "@/data/products";
import { collectionFor, type Collection } from "./collections";

export type CatalogSearch = { q?: string; collection?: Collection; available?: true };
export const catalogCollections = [
  {
    id: "story",
    title: "Descoperă povestea",
    subtitle: "Pentru fanii lumilor îndrăgite",
    detail: "Filme, cărți și universuri de colecționat.",
  },
  {
    id: "emotion",
    title: "Trăiește emoția",
    subtitle: "Pentru amintirile voastre",
    detail: "Melodii care spun ce simți, fără cuvinte.",
  },
  {
    id: "dedicated",
    title: "Cutiuțe dedicate",
    subtitle: "Pentru cineva anume",
    detail: "Mici daruri alese după pasiuni și momente.",
  },
] as const;

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  return {
    ...(typeof search.q === "string" && search.q ? { q: search.q.slice(0, 100) } : {}),
    ...(catalogCollections.some((c) => c.id === search.collection)
      ? { collection: search.collection as Collection }
      : {}),
    ...(search.available === true || search.available === "true"
      ? { available: true as const }
      : {}),
  };
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("ro-RO")
    .trim();

export function filterCatalog(products: Product[], search: CatalogSearch): Product[] {
  const words = normalize(search.q ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return products
    .filter((product) => {
      if (search.collection && collectionFor(product) !== search.collection) return false;
      if (search.available && !isAvailable(product)) return false;
      const text = normalize(
        [
          product.name,
          product.tagline,
          product.melody,
          product.category,
          product.description,
          ...product.searchTerms,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
