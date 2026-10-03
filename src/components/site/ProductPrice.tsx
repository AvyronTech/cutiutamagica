import type { Product } from "@/data/products";
import {
  currentPriceBani,
  hasProductDiscount,
  productSavingsBani,
  referencePriceBani,
} from "@/lib/product-price";

const money = (bani: number) => `${(bani / 100).toLocaleString("ro-RO")} lei`;

export function ProductPrice({
  product,
  quantity = 1,
  size = "card",
  tone = "dark",
  className = "",
  showSavings = true,
}: {
  product: Pick<Product, "price" | "originalPrice">;
  quantity?: number;
  size?: "compact" | "card" | "detail";
  tone?: "dark" | "light";
  className?: string;
  showSavings?: boolean;
}) {
  const qty = Math.max(1, Math.floor(quantity));
  const discounted = hasProductDiscount(product);
  const current = currentPriceBani(product) * qty;
  const reference = referencePriceBani(product) * qty;
  const savings = productSavingsBani(product) * qty;

  return (
    <div
      className={`product-price product-price--${size} product-price--${tone} ${className}`.trim()}
      aria-label={
        discounted
          ? `Preț redus ${money(current)}, de la ${money(reference)}, TVA inclus`
          : `Preț ${money(current)}, TVA inclus`
      }
    >
      {discounted && <del title="Preț anterior documentat">{money(reference)}</del>}
      <span className="product-price__current">{money(current)}</span>
      <small>TVA inclus</small>
      {discounted && showSavings && (
        <span className="product-price__saving">Economisești {money(savings)}</span>
      )}
    </div>
  );
}
