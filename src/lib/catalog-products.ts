import { products as editorial, type Product } from "@/data/products";
import type { CatalogProduct } from "@/server/db/catalog.repository";

/**
 * Catalogul afișat: rândurile din D1 (nume, preț, SKU, categorie) peste conținutul
 * editorial din `src/data/products.ts` (galerie, poveste, detalii, disponibilitate).
 *
 * Produsele preluate din anunțurile Vinted (`source`) își păstrează pozele și
 * descrierea din fișierul editorial — acolo stă galeria completă, procesată.
 */
export function catalogProducts(catalog: CatalogProduct[]): Product[] {
  return catalog.map((row) => {
    const copy = editorial.find((p) => p.id === row.slug);
    const fromListing = Boolean(copy?.source);
    const gallery = fromListing
      ? (copy?.gallery ?? [])
      : row.imageUrl
        ? [
            { src: row.imageUrl, label: row.name },
            ...(copy?.gallery ?? []).filter((image) => image.src !== row.imageUrl),
          ]
        : (copy?.gallery ?? []);

    return {
      ...copy,
      id: row.slug,
      sku: row.sku,
      updatedAt: row.updatedAt,
      name: fromListing ? (copy?.name ?? row.name) : row.name,
      category: row.category,
      melody: row.melody ?? copy?.melody ?? undefined,
      image: (fromListing ? copy?.image : "") || row.imageUrl || copy?.image || "",
      gallery,
      tagline: copy?.tagline || row.shortDescription || "",
      description:
        (fromListing ? copy?.description : "") || row.shortDescription || copy?.description || "",
      story: copy?.story || "",
      details: (copy?.details ?? []).filter((text) => !/\d+\s*(lei|RON|buc)/i.test(text)),
      searchTerms: copy?.searchTerms ?? [],
      price: row.price,
      originalPrice: row.originalPrice,
      // Disponibilitatea vine din fișierul editorial: produsele fără marcaj sunt de vânzare.
      availability: copy?.availability ?? "available",
      source: copy?.source,
    };
  });
}
