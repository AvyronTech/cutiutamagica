import type { Product } from "@/data/products";
import type { CatalogProduct } from "@/server/db/catalog.repository";
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
    melody: row.melody ?? undefined,
    image: row.imageUrl || "/icon-512.png",
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
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  }));
}
