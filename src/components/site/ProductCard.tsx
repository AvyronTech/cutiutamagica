import { animateIntoCart } from "@/lib/cart-flight";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Hourglass } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { Product } from "@/data/products";
import { MAX_QTY, isAvailable } from "@/data/products";
import { useShop } from "@/store/shop";
import { ProductImage } from "@/components/site/ProductImage";
import { ProductPrice } from "@/components/site/ProductPrice";
import { LimitedEditionBadge } from "@/components/site/LimitedEditionBadge";
import { notifyAddedToCart } from "@/lib/notify";
import { productScene } from "@/lib/product-themes";
import type { CSSProperties } from "react";
import { productLink } from "@/lib/product-url";

type Variant = "solid" | "glass";

export function ProductCard({
  product,
  index = 0,
  variant = "glass",
  compact = false,
}: {
  product: Product;
  index?: number;
  variant?: Variant;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const { addToCart, products } = useShop();
  product = products.find((p) => p.id === product.id) ?? product;
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const available = isAvailable(product);
  const isGlass = variant === "glass";
  const theme = productScene(product.id, product.scene);

  return (
    <motion.div
      data-magic-card
      data-product-scene={theme.scene}
      data-compact={compact || undefined}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: reduced ? 0 : 0.5, delay: Math.min(index, 4) * 0.05 }}
      style={{ "--card-accent": theme.accent } as CSSProperties}
      className={`product-card-themed group relative rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 flex flex-col ${
        isGlass
          ? "product-card-themed--glass border border-white/20 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] bg-white/8 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/15"
          : "product-card-themed--solid border border-[color:var(--gold)]/25 shadow-soft hover:shadow-warm"
      }`}
    >
      <div className="product-card-scene" aria-hidden>
        <ProductImage
          src={product.image}
          alt=""
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 320px"
          className="product-card-scene__image"
        />
        <span className="product-card-scene__plane" />
        <span className="product-card-scene__orbit" />
      </div>
      <Link {...productLink(product.id)} className="block">
        <div
          className={`product-card-themed__visual ${
            isGlass
              ? "relative aspect-square overflow-hidden bg-[radial-gradient(70%_60%_at_50%_30%,rgba(255,255,255,0.22),transparent_70%)]"
              : "relative aspect-square overflow-hidden bg-[radial-gradient(70%_60%_at_50%_30%,oklch(0.98_0.03_80/0.9),transparent_70%),linear-gradient(180deg,oklch(0.95_0.04_70),oklch(0.9_0.06_60))]"
          }`}
        >
          <LimitedEditionBadge edition={product.limitedEdition} surface="card" />
          {!available && (
            <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold)]/50 bg-[color:var(--wood-dark)]/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)] backdrop-blur">
              <Hourglass className="h-3 w-3" aria-hidden />
              {product.availability === "out_of_stock" ? "Stoc epuizat" : "În curând"}
            </span>
          )}
          <motion.div
            className="h-full w-full"
            whileHover={reduced ? undefined : { scale: 1.025 }}
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
              style={{
                background:
                  "radial-gradient(70% 50% at 50% 20%, rgb(var(--magic-tint, 225 189 126) / .12), transparent 65%)",
              }}
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </div>

        <div
          className={`product-card-themed__content ${
            isGlass
              ? "px-4 pt-2 pb-3 text-center text-[color:var(--cream)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
              : "px-4 pt-2 pb-3 text-center"
          }`}
        >
          <h3 className="font-display text-lg font-semibold leading-snug">
            {product.shortName || product.name}
          </h3>
          {product.tagline && (
            <p
              className={`mt-1 text-sm leading-relaxed line-clamp-2 ${
                isGlass ? "text-[color:var(--cream)]/85" : "text-foreground/70"
              }`}
            >
              {product.tagline}
            </p>
          )}
          <div className="mt-2 flex items-center justify-center">
            {!available && (
              <span
                className={`text-xs uppercase tracking-[0.2em] ${isGlass ? "text-[color:var(--cream)]/80" : "text-foreground/60"}`}
              >
                {product.availability === "out_of_stock"
                  ? "Revine în colecție"
                  : "Disponibil în curând"}
              </span>
            )}
            {available && (
              <ProductPrice product={product} tone={isGlass ? "light" : "dark"} size="card" />
            )}
          </div>
        </div>
      </Link>
      <div className="product-card-themed__actions px-4 pb-4 mt-auto flex flex-col gap-2">
        {available ? (
          <>
            {!compact && (
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
            <button
              onClick={(e) => {
                e.preventDefault();
                const added = addToCart(product.id, qty);
                animateIntoCart(e.currentTarget, product.image, added);
                notifyAddedToCart(product.name, added, () => navigate({ to: "/comanda" }));
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[color:var(--gold)]/60 bg-[linear-gradient(135deg,oklch(0.82_0.13_70),oklch(0.72_0.15_55))] py-2 text-sm font-semibold text-[color:var(--wood-dark)] shadow-[0_6px_18px_-8px_rgba(120,70,20,0.7)] transition hover:scale-[1.02] hover:shadow-[0_10px_24px_-8px_rgba(120,70,20,0.85)]"
            >
              <ShoppingBag className="h-4 w-4" /> Adaugă în coș
            </button>
          </>
        ) : (
          <Link
            {...productLink(product.id)}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition ${
              isGlass
                ? "border-white/25 bg-white/10 text-[color:var(--cream)] hover:bg-white/15"
                : "border-[color:var(--gold)]/40 bg-[color:var(--cream)]/60 text-[color:var(--wood-dark)] hover:bg-[color:var(--cream)]"
            }`}
          >
            <Hourglass className="w-4 h-4" aria-hidden /> Vezi detalii
          </Link>
        )}
      </div>
    </motion.div>
  );
}
