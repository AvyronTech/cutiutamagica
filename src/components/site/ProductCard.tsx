import { Link } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Product } from "@/data/products";
import { PRICE, MAX_QTY } from "@/data/products";
import { useShop } from "@/store/shop";
import { toast } from "sonner";

type Variant = "solid" | "glass";

export function ProductCard({
  product,
  index = 0,
  variant = "glass",
}: {
  product: Product;
  index?: number;
  variant?: Variant;
}) {
  const { addToCart, products } = useShop();
  product = products.find((p) => p.id === product.id) ?? product;
  const [qty, setQty] = useState(1);
  const displayPrice = product.price ?? PRICE;
  const isGlass = variant === "glass";
  const discounted = product.originalPrice != null && product.originalPrice > displayPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className={
        isGlass
          ? "group relative rounded-2xl overflow-hidden border border-white/20 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] transition-all hover:-translate-y-0.5 flex flex-col bg-white/8 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/15"
          : "group relative rounded-2xl overflow-hidden border border-[color:var(--gold)]/25 shadow-soft hover:shadow-warm transition-all hover:-translate-y-0.5 flex flex-col bg-[linear-gradient(160deg,oklch(0.97_0.025_75)_0%,oklch(0.93_0.05_65)_55%,oklch(0.88_0.07_55)_100%)]"
      }
    >
      <Link to="/produs/$id" params={{ id: product.id }} className="block">
        <div
          className={
            isGlass
              ? "relative aspect-square overflow-hidden px-2 pt-2 pb-2 bg-[radial-gradient(70%_60%_at_50%_30%,rgba(255,255,255,0.22),transparent_70%)]"
              : "relative aspect-square overflow-hidden px-2 pt-1 pb-2 bg-[radial-gradient(70%_60%_at_50%_30%,oklch(0.98_0.03_80/0.9),transparent_70%),linear-gradient(180deg,oklch(0.95_0.04_70),oklch(0.9_0.06_60))]"
          }
        >
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6 }}
            loading="lazy"
          />
          {discounted && (
            <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-sm text-rose-900 shadow-sm">
              <span className="block text-[10px] uppercase">Un dar, un preț special</span>
              <del className="mr-2 text-xs text-neutral-500">{product.originalPrice} lei</del>
              <strong>{displayPrice} lei</strong>
            </span>
          )}
        </div>

        <div
          className={
            isGlass
              ? "px-4 pt-2 pb-3 text-center text-[color:var(--cream)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
              : "px-4 pt-2 pb-3 text-center"
          }
        >
          <h3 className="font-display text-base leading-tight">{product.name}</h3>
          {product.tagline && (
            <p
              className={`mt-1 text-[11.5px] md:text-xs leading-snug line-clamp-2 ${
                isGlass ? "text-[color:var(--cream)]/85" : "text-foreground/70"
              }`}
            >
              {product.tagline}
            </p>
          )}
          <div className="mt-2 flex items-baseline justify-center gap-2">
            {discounted && (
              <del className="text-xs opacity-70" title="Preț anterior de referință documentat">
                {product.originalPrice} lei
              </del>
            )}
            <span className={`font-display text-xl ${isGlass ? "text-[color:var(--gold)]" : ""}`}>
              {displayPrice}{" "}
              <span className={`text-xs ${isGlass ? "text-[color:var(--cream)]/90" : ""}`}>
                lei
              </span>
            </span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 mt-auto flex flex-col gap-2">
        <div
          className={`flex items-center justify-center gap-3 rounded-md py-1.5 ${
            isGlass ? "bg-black/25 backdrop-blur text-[color:var(--cream)]" : "bg-muted/50"
          }`}
        >
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className={`p-1 rounded ${isGlass ? "hover:bg-white/15" : "hover:bg-background"}`}
            aria-label="Scade"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-medium text-sm w-6 text-center">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            className={`p-1 rounded ${isGlass ? "hover:bg-white/15" : "hover:bg-background"}`}
            aria-label="Crește"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(product.id, qty);
            toast.success(`${qty} × adăugat în coș`, { description: product.name });
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[color:var(--gold)]/60 bg-[linear-gradient(135deg,oklch(0.82_0.13_70),oklch(0.72_0.15_55))] py-2 text-sm font-semibold text-[color:var(--wood-dark)] shadow-[0_6px_18px_-8px_rgba(120,70,20,0.7)] transition hover:scale-[1.02] hover:shadow-[0_10px_24px_-8px_rgba(120,70,20,0.85)]"
        >
          <ShoppingBag className="h-4 w-4" /> Adaugă în coș
        </button>
      </div>
    </motion.div>
  );
}
