import { productLimitedEdition, type Product } from "@/data/products";
import type { CatalogProduct } from "@/server/db/catalog.repository";

const localProductPhotos: Record<string, string> = {
  "hp-keeper": "/produse/hp-keeper/card.webp",
  "got-winter": "/produse/got-winter/card.webp",
  sunshine: "/produse/sunshine/card.webp",
  kitten: "/produse/kitten/card.webp",
  halloween: "/produse/halloween/card.webp",
  "hp-always": "/produse/archive/hp-always.webp",
  pirates: "/produse/archive/pirates.webp",
  "lotr-rings": "/produse/archive/lotr-rings.webp",
  "starwars-dad": "/produse/archive/starwars-dad.webp",
  fairy: "/produse/archive/fairy.webp",
};
export const localProductPhoto = (slug: string) => localProductPhotos[slug] ?? null;
/** The dashboard is authoritative. Local editorial content is imported once by migration. */
export function catalogProducts(catalog: CatalogProduct[]): Product[] {
  return catalog.map((row) => ({
    id: row.slug,
    discovery: row.discovery,
    scene: row.scene,
    sku: row.sku,
    updatedAt: row.updatedAt,
    name: row.name,
    shortName: row.shortName,
    category: row.category,
    brand: row.brand,
    gtin: row.gtin ?? undefined,
    mpn: row.mpn ?? undefined,
    melody: row.melody ?? undefined,
    image: row.imageUrl || localProductPhoto(row.slug) || "/icon-512.png",
    gallery: row.gallery,
    tagline: row.tagline,
    description: row.description || row.shortDescription,
    story: row.story,
    details: row.details,
    searchTerms: row.searchTerms,
    price: row.price ?? undefined,
    originalPrice: row.originalPrice,
    availability: row.availability,
    collection: row.collection,
    sortOrder: row.sortOrder,
    featured: row.featured,
    preorderEnabled: row.preorderEnabled,
    releaseNote: row.releaseNote,
    limitedEdition: productLimitedEdition(row.slug),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  }));
}
