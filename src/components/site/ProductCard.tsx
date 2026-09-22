import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, ShoppingBag, Minus, Plus, Hourglass } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Product } from "@/data/products";
import { PRICE, MAX_QTY, isAvailable } from "@/data/products";
import { useShop } from "@/store/shop";
import { ProductImage } from "@/components/site/ProductImage";
import { notifyAddedToCart, notifyFavorite } from "@/lib/notify";

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
  const { addToCart, toggleFavorite, isFavorite } = useShop();
  const navigate = useNavigate();
  const fav = isFavorite(product.id);
  const [qty, setQty] = useState(1);
  const displayPrice = product.price ?? PRICE;
  const isGlass = variant === "glass";
  const available = isAvailable(product);

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
          {!available && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold)]/50 bg-[color:var(--wood-dark)]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)] backdrop-blur">
              <Hourglass className="h-3 w-3" aria-hidden />
              În curând
            </span>
          )}
          <motion.div
            className="h-full w-full"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6 }}
          >
            <ProductImage
              src={product.image}
              alt={product.name}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
              className={`w-full h-full drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] ${
                product.source ? "object-cover rounded-xl" : "object-contain"
              } ${available ? "" : "saturate-[0.55] brightness-[0.82]"}`}
            />
          </motion.div>
          {/* Licărire aurie la hover — doar pe cartonașele produselor disponibile. */}
          {available && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(70%_50%_at_50%_20%,oklch(0.95_0.13_85/0.18),transparent_65%)]"
            />
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
            {!available ? (
              <span
                className={`text-xs uppercase tracking-[0.2em] ${isGlass ? "text-[color:var(--cream)]/80" : "text-foreground/60"}`}
              >
                Disponibil în curând
              </span>
            ) : (
              <span className={`font-display text-xl ${isGlass ? "text-[color:var(--gold)]" : ""}`}>
                {displayPrice}{" "}
                <span className={`text-xs ${isGlass ? "text-[color:var(--cream)]/90" : ""}`}>
                  lei
                </span>
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 mt-auto flex flex-col gap-2">
        {available && (
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
        )}
        <div className="flex gap-2">
          {available ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart(product.id, qty);
                notifyAddedToCart(product.name, qty, () => navigate({ to: "/comanda" }));
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[linear-gradient(135deg,oklch(0.82_0.13_70),oklch(0.72_0.15_55))] text-[color:var(--wood-dark)] rounded-md py-2 text-sm font-semibold border border-[color:var(--gold)]/60 shadow-[0_6px_18px_-8px_rgba(120,70,20,0.7)] hover:scale-[1.02] hover:shadow-[0_10px_24px_-8px_rgba(120,70,20,0.85)] transition"
            >
              <ShoppingBag className="w-4 h-4" /> Comandă
            </button>
          ) : (
            <Link
              to="/produs/$id"
              params={{ id: product.id }}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium border transition ${
                isGlass
                  ? "border-white/25 bg-white/10 text-[color:var(--cream)] hover:bg-white/15"
                  : "border-[color:var(--gold)]/40 bg-[color:var(--cream)]/60 text-[color:var(--wood-dark)] hover:bg-[color:var(--cream)]"
              }`}
            >
              <Hourglass className="w-4 h-4" aria-hidden /> Vezi detalii
            </Link>
          )}
          <button
            onClick={() => {
              toggleFavorite(product.id);
              notifyFavorite(product.name, !fav);
            }}
            className={`p-2 rounded-md border ${
              isGlass
                ? `border-white/25 ${fav ? "bg-[color:var(--gold)]/30 text-[color:var(--cream)]" : "bg-white/10 text-[color:var(--cream)] hover:bg-white/20"}`
                : `border-border ${fav ? "bg-[color:var(--gold)]/20 text-[color:var(--wood-dark)]" : "hover:bg-muted"}`
            }`}
            aria-label="Favorite"
          >
            <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
