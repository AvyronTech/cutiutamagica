import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Minus, Plus } from "lucide-react";
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
  

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group relative rounded-2xl overflow-hidden border border-[color:var(--cream)]/25 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] transition-all hover:-translate-y-0.5 flex flex-col bg-[color:var(--cream)]/10 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/15"
    >
      <Link to="/produs/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square overflow-hidden px-2 pt-2 pb-2 bg-[radial-gradient(70%_60%_at_50%_30%,rgba(255,255,255,0.18),transparent_70%)]">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(80,40,10,0.25)]"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6 }}
            loading="lazy"
          />
        </div>

        <div className="px-4 pt-2 pb-3 text-center text-[color:var(--cream)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          <h3 className="font-display text-base leading-tight">{product.name}</h3>
          <div className="mt-1.5 flex items-baseline justify-center gap-2">
            <span className="font-display text-xl text-[color:var(--gold)]">{displayPrice} <span className="text-xs text-[color:var(--cream)]/90">lei</span></span>
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
