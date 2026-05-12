import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { Heart, ShoppingBag, ArrowLeft, Music, Truck, Gift, Sparkles } from "lucide-react";
import { getProduct, products, PRICE } from "@/data/products";
import { useShop } from "@/store/shop";
import { ProductCard } from "@/components/site/ProductCard";
import { toast } from "sonner";

export const Route = createFileRoute("/produs/$id")({
  component: ProductPage,
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — Cutiuța Magică` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: loaderData.product.name },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [],
  }),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleFavorite, isFavorite } = useShop();
  const fav = isFavorite(product.id);
  const ref = useRef<HTMLDivElement>(null);

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-20, 20]), { stiffness: 200, damping: 20 });

  function handleMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }
  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Link to="/produse" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Înapoi la produse
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-12 items-start">
        {/* 3D animation */}
        <div className="perspective-1000">
          <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
            className="relative aspect-square rounded-2xl overflow-hidden shadow-warm bg-[color:var(--wood-dark)]"
          >
            <motion.img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              style={{ transform: "translateZ(40px)" }}
            />
            <motion.div
              style={{ transform: "translateZ(80px)" }}
              className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
            >
              <Music className="w-3 h-3" /> {product.melody}
            </motion.div>
          </motion.div>
          <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> Mișcă mouse-ul peste imagine
          </p>
        </div>

        {/* Details */}
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">{product.category}</div>
          <h1 className="font-display text-4xl md:text-5xl mt-2 leading-tight">{product.name}</h1>
          <p className="mt-2 text-lg italic text-muted-foreground">{product.tagline}</p>

          <div className="mt-6 flex items-baseline gap-4">
            <span className="font-display text-5xl">{PRICE} lei</span>
            <span className="text-sm text-muted-foreground">75 lei/buc la 2+</span>
          </div>

          <p className="mt-6 text-base leading-relaxed">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => {
                addToCart(product.id);
                toast.success("Adăugat în coș", { description: product.name });
              }}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-6 py-3 font-medium hover:opacity-90"
            >
              <ShoppingBag className="w-4 h-4" /> Comandă acum
            </button>
            <Link to="/comanda" className="inline-flex items-center gap-2 wood-grain text-[color:var(--cream)] rounded-md px-6 py-3 font-medium">
              Finalizează comanda
            </Link>
            <button
              onClick={() => toggleFavorite(product.id)}
              className={`p-3 rounded-md border border-border ${fav ? "bg-[color:var(--gold)]/20" : "hover:bg-muted"}`}
              aria-label="Favorite"
            >
              <Heart className={`w-5 h-5 ${fav ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Transport gratuit la 3+</div>
            <div className="flex items-center gap-2"><Gift className="w-4 h-4" /> Ambalaj cadou</div>
          </div>

          <div className="mt-10 border-t border-border pt-8">
            <h2 className="font-display text-2xl">Povestea acestei cutiuțe</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{product.story}</p>
          </div>

          <div className="mt-8">
            <h3 className="font-display text-xl">Detalii</h3>
            <ul className="mt-3 space-y-2">
              {product.details.map((d: string) => (
                <li key={d} className="flex gap-2 text-sm">
                  <span className="text-[color:var(--gold)]">✦</span> {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl mb-6">Și acestea îți pot plăcea</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
