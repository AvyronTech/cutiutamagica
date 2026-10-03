import { isAvailable, type Product } from "@/data/products";
export type Collection = "story" | "emotion" | "dedicated";
export const collectionFor = (product: Product): Collection =>
  product.collection ??
  (product.id === "sunshine"
    ? "emotion"
    : ["kitten", "halloween", "starwars-dad"].includes(product.id)
      ? "dedicated"
      : "story");
export const collectionProducts = (products: Product[], collection: Collection) =>
  products
    .filter((p) => isAvailable(p) && collectionFor(p) === collection)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
