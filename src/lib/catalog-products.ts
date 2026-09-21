import { products as editorial, type Product } from "@/data/products";
import type { CatalogProduct } from "@/server/db/catalog.repository";
export function catalogProducts(catalog: CatalogProduct[]): Product[] {
  return catalog.map((row) => {
    const copy = editorial.find((p) => p.id === row.slug);
    return {
      ...copy,
      id: row.slug,
      sku: row.sku,
      updatedAt: row.updatedAt,
      name: row.name,
      category: row.category,
      melody: row.melody ?? undefined,
      image: row.imageUrl || copy?.image || "",
      gallery: row.imageUrl
        ? [
            { src: row.imageUrl, label: row.name },
            ...(copy?.gallery ?? []).filter((image) => image.src !== row.imageUrl),
          ]
        : (copy?.gallery ?? []),
      tagline: row.shortDescription || copy?.tagline || "",
      description: row.shortDescription || copy?.description || "",
      story: copy?.story || "",
      details: (copy?.details ?? []).filter((text) => !/\d+\s*(lei|RON|buc)/i.test(text)),
      searchTerms: copy?.searchTerms ?? [],
      price: row.price,
      originalPrice: row.originalPrice,
    };
  });
}
