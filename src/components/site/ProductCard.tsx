import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Minus, Plus, Images } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import type { Product } from "@/data/products";
import { PRICE, MAX_QTY } from "@/data/products";
import { useShop } from "@/store/shop";
import { toast } from "sonner";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addToCart, toggleFavorite, isFavorite } = useShop();
  const fav = isFavorite(product.id);
  const [qty, setQty] = useState(1);
  const displayPrice = product.price ?? PRICE;
  const imageCount = product.gallery?.length ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group relative bg-card rounded-xl overflow-hidden border border-border/60 shadow-soft hover:shadow-warm transition-shadow flex flex-col"
    >
      <Link to="/produs/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted/40 p-3">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.14)]"
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.6 }}
            loading="lazy"
          />
          <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.15em] bg-background/90 backdrop-blur px-2 py-1 rounded">
            {product.category}
          </div>
          {imageCount > 1 && (
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <Images className="w-3 h-3" /> {imageCount} imagini
            </div>
          )}
        </div>
        <div className="p-4 text-center">
          <h3 className="font-display text-lg leading-tight">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-8">{product.tagline}</p>
          <div className="mt-3 flex items-baseline justify-center gap-2">
            <span className="font-display text-2xl">{displayPrice} <span className="text-sm">lei</span></span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-center gap-3 bg-muted/50 rounded-md py-1.5">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="p-1 rounded hover:bg-background"
            aria-label="Scade"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-medium text-sm w-6 text-center">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
            className="p-1 rounded hover:bg-background"
            aria-label="Crește"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              addToCart(product.id, qty);
              toast.success(`${qty} × adăugat în coș`, { description: product.name });
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 transition"
          >
            <ShoppingBag className="w-4 h-4" /> Comandă
          </button>
          <button
            onClick={() => toggleFavorite(product.id)}
            className={`p-2 rounded-md border border-border ${fav ? "bg-[color:var(--gold)]/20 text-[color:var(--wood-dark)]" : "hover:bg-muted"}`}
            aria-label="Favorite"
          >
            <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
