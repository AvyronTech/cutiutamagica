import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { Heart, ShoppingBag, ArrowLeft, Music, Truck, Gift, Sparkles, Minus, Plus } from "lucide-react";
import { getProduct, products, PRICE, MAX_QTY } from "@/data/products";
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
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const url = `https://cutiutamagica.lovable.app/produs/${params.id}`;
    return {
      meta: [
        { title: `${loaderData.product.name} — Cutiuța Magică` },
        { name: "description", content: loaderData.product.description },
        { property: "og:title", content: loaderData.product.name },
        { property: "og:description", content: loaderData.product.description },
        { property: "og:image", content: loaderData.product.image },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: loaderData.product.name,
            image: loaderData.product.image,
            description: loaderData.product.description,
            category: loaderData.product.category,
            offers: {
              "@type": "Offer",
              price: "89",
              priceCurrency: "RON",
              availability: "https://schema.org/InStock",
              url,
            },
          }),
        },
      ],
    };
  },
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleFavorite, isFavorite } = useShop();
  const fav = isFavorite(product.id);
  const ref = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-16, 16]), { stiffness: 200, damping: 20 });

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

  const related = useMemo(() => products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4), [product.id, product.category]);
  const currentImage = product.gallery[active] ?? product.gallery[0];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Link to="/produse" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Înapoi la produse</Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-12 items-start">
        <div className="perspective-1000">
          <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="relative aspect-square rounded-2xl overflow-hidden shadow-warm bg-card p-4">
            <motion.img src={currentImage.src} alt={`${product.name} — ${currentImage.label}`} className="w-full h-full object-contain" style={{ transform: "translateZ(36px)", objectPosition: currentImage.position ?? "center" }} />
            <motion.div style={{ transform: "translateZ(60px)" }} className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"><Music className="w-3 h-3" /> {product.melody}</motion.div>
          </motion.div>
          <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Vizualizare 3D din fotografia originală</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {product.gallery.map((image: (typeof product.gallery)[number], index: number) => (
              <button key={`${product.id}-${image.label}`} onClick={() => setActive(index)} className={`rounded-xl border p-2 bg-card transition ${active === index ? "border-primary shadow-soft" : "border-border hover:bg-muted"}`}>
                <img src={image.src} alt={image.label} className="aspect-square w-full object-contain" style={{ objectPosition: image.position ?? "center" }} />
                <span className="mt-2 block text-[11px] text-center text-muted-foreground">{image.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</p>
          <h1 className="font-display text-4xl md:text-5xl mt-2">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.tagline}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl">{PRICE} lei</span>
            <span className="text-sm text-muted-foreground">75 lei/buc la 3+ · transport gratuit</span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border bg-card">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 hover:bg-muted rounded-l-full" aria-label="Scade"><Minus className="w-4 h-4" /></button>
              <span className="px-4 font-medium tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} className="p-2.5 hover:bg-muted rounded-r-full" aria-label="Crește"><Plus className="w-4 h-4" /></button>
            </div>
            <button
              onClick={() => { addToCart(product.id, qty); toast.success(`${qty} × ${product.name} adăugată în coș`); }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
            >
              <ShoppingBag className="w-4 h-4" /> Adaugă în coș
            </button>
            <button onClick={() => toggleFavorite(product.id)} className={`p-3 rounded-full border ${fav ? "bg-primary/10 border-primary text-primary" : "bg-card hover:bg-muted"}`} aria-label="Favorite">
              <Heart className={`w-5 h-5 ${fav ? "fill-current" : ""}`} />
            </button>
          </div>

          <Link to="/comanda" className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-full border border-primary/40 px-6 py-3 text-sm font-medium hover:bg-primary/5">
            <Gift className="w-4 h-4" /> Finalizează comanda
          </Link>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-xl border p-3"><Truck className="w-4 h-4" /> Transport gratuit la 3+</div>
            <div className="flex items-center gap-2 rounded-xl border p-3"><Gift className="w-4 h-4" /> Ambalaj cadou inclus</div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-xl">Despre cutiuță</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.story}</p>
          </div>

          <div className="mt-8">
            <h3 className="font-display text-xl">Detalii</h3>
            <ul className="mt-3 space-y-2">
              {product.details.map((d: string) => <li key={d} className="flex gap-2 text-sm"><span className="text-[color:var(--gold)]">✦</span> {d}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl mb-6 text-center">Și acestea îți pot plăcea</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
        </section>
      )}
    </div>
  );
}
