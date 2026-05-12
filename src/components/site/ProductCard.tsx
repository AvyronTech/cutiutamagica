import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/data/products";
import { PRICE } from "@/data/products";
import { useShop } from "@/store/shop";
import { toast } from "sonner";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { addToCart, toggleFavorite, isFavorite } = useShop();
  const fav = isFavorite(product.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group relative bg-card rounded-xl overflow-hidden border border-border/60 shadow-soft hover:shadow-warm transition-shadow"
    >
      <Link to="/produs/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-[color:var(--wood-dark)]">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.6 }}
          />
          <div className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.15em] bg-background/90 backdrop-blur px-2 py-1 rounded">
            {product.category}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg leading-tight">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.tagline}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl">{PRICE} <span className="text-sm">lei</span></span>
            <span className="text-xs text-muted-foreground">75 lei/buc la 3+ · transport gratuit</span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(product.id);
            toast.success("Adăugat în coș", { description: product.name });
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90 transition"
        >
          <ShoppingBag className="w-4 h-4" /> Comandă acum
        </button>
        <button
          onClick={() => toggleFavorite(product.id)}
          className={`p-2 rounded-md border border-border ${fav ? "bg-[color:var(--gold)]/20 text-[color:var(--wood-dark)]" : "hover:bg-muted"}`}
          aria-label="Favorite"
        >
          <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
        </button>
      </div>
    </motion.div>
  );
}
