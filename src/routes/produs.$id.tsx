import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  Heart,
  ShoppingBag,
  Music,
  Package,
  Gift,
  Sparkles,
  Minus,
  Plus,
  Rotate3D,
} from "lucide-react";
import { getProduct, products, PRICE, MAX_QTY } from "@/data/products";
import { useShop } from "@/store/shop";
import { notifyAddedToCart, notifyFavorite } from "@/lib/notify";
import { ProductCard } from "@/components/site/ProductCard";
import {
  ProductAnimation,
  ProductAudioOverlay,
  ProductSpinViewer,
  useProductExperience,
} from "@/components/site/ProductMediaExperience";

export const Route = createFileRoute("/produs/$id")({
  component: ProductPage,
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const url = `https://cutiutamagica.eu/produs/${params.id}`;
    const image = loaderData.product.image.startsWith("http")
      ? loaderData.product.image
      : `https://cutiutamagica.eu${loaderData.product.image}`;
    const price = String(loaderData.product.price ?? PRICE);
    const description = `${loaderData.product.tagline} Cutiuță muzicală din lemn, cu manivelă și mecanism manual${loaderData.product.melody ? `, melodia ${loaderData.product.melody}` : ""}.`;
    return {
      meta: [
        { title: `${loaderData.product.name} — Cutiuța Magică` },
        { name: "description", content: description },
        { property: "og:title", content: loaderData.product.name },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        { property: "product:price:amount", content: price },
        { property: "product:price:currency", content: "RON" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: loaderData.product.name,
            sku: loaderData.product.sku,
            image: [image],
            description,
            category: loaderData.product.category,
            material: "Lemn",
            brand: { "@type": "Brand", name: "Cutiuța Magică" },
            additionalProperty: [
              { "@type": "PropertyValue", name: "Mecanism", value: "Manual, cu manivelă" },
              ...(loaderData.product.melody
                ? [{ "@type": "PropertyValue", name: "Melodie", value: loaderData.product.melody }]
                : []),
            ],
            url,
            offers: {
              "@type": "Offer",
              price,
              priceCurrency: "RON",
              itemCondition: "https://schema.org/NewCondition",
              url,
              seller: { "@type": "Organization", name: "Cutiuța Magică" },
              // Exact ce spune /retur: retragere în 14 zile, returul prin curier, cost suportat de client.
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "RO",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: 14,
                returnMethod: "https://schema.org/ReturnByMail",
                returnFees: "https://schema.org/ReturnShippingFees",
                merchantReturnLink: "https://cutiutamagica.eu/retur",
              },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Acasă",
                item: "https://cutiutamagica.eu/",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Produse",
                item: "https://cutiutamagica.eu/produse",
              },
              { "@type": "ListItem", position: 3, name: loaderData.product.name, item: url },
            ],
          }),
        },
      ],
    };
  },
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addToCart, toggleFavorite, isFavorite } = useShop();
  const navigate = useNavigate();
  const fav = isFavorite(product.id);
  const ref = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [show360, setShow360] = useState(false);
  const experienceQuery = useProductExperience(product.id);

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

  const related = useMemo(
    () =>
      products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4),
    [product.id, product.category],
  );
  const remoteGallery =
    experienceQuery.data?.gallery.map((image) => ({
      src: image.url,
      label: image.alt_text || image.title || product.name,
      position: "center",
    })) ?? [];
  const gallery = remoteGallery.length > 0 ? remoteGallery : product.gallery;
  const currentImage = gallery[active] ?? gallery[0];
  const spin = experienceQuery.data?.spin360 ?? null;
  const has360 = Boolean(
    spin &&
    ((spin.spin_type === "image_sequence" && spin.frames.length >= 2) ||
      (spin.spin_type === "turntable_video" && spin.primaryMediaUrl)),
  );
  const spinThumb = spin ? (spin.coverUrl ?? spin.frames[0]?.url ?? null) : null;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-12 items-start">
        <div className="perspective-1000">
          {show360 && spin && has360 ? (
            <div className="relative overflow-hidden rounded-2xl shadow-warm">
              <ProductSpinViewer spin={spin} productName={product.name} />
            </div>
          ) : (
            <motion.div
              ref={ref}
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
              style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
              className="relative aspect-square rounded-2xl overflow-hidden shadow-warm bg-card p-4"
            >
              <motion.img
                src={currentImage.src}
                alt={`${product.name} — ${currentImage.label}`}
                className="w-full h-full object-contain"
                style={{
                  transform: "translateZ(36px)",
                  objectPosition: currentImage.position ?? "center",
                }}
              />
              {experienceQuery.data?.audio ? (
                <ProductAudioOverlay audio={experienceQuery.data.audio} />
              ) : product.melody ? (
                <motion.div
                  style={{ transform: "translateZ(60px)" }}
                  className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                >
                  <Music className="w-3 h-3" /> {product.melody}
                </motion.div>
              ) : null}
            </motion.div>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            {show360 ? (
              <>
                <Rotate3D className="w-3 h-3" /> Vedere 360° din cadre reale · trage sau folosește
                săgețile
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" /> Efect de profunzime aplicat fotografiei produsului
              </>
            )}
          </p>
          <div className={`mt-4 grid gap-3 ${has360 ? "grid-cols-4" : "grid-cols-3"}`}>
            {has360 && (
              <button
                type="button"
                onClick={() => setShow360(true)}
                aria-pressed={show360}
                aria-label="Vedere 360 de grade"
                className={`group relative rounded-xl border p-2 bg-card transition ${show360 ? "border-[color:var(--gold)] shadow-soft" : "border-border hover:bg-muted"}`}
              >
                {spinThumb ? (
                  <img
                    src={spinThumb}
                    alt=""
                    className="aspect-square w-full object-contain opacity-80 transition group-hover:opacity-100"
                  />
                ) : (
                  <span className="block aspect-square w-full" />
                )}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gold)]/60 bg-[oklch(0.2_0.035_40/0.88)] px-2 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--gold)] shadow-soft backdrop-blur">
                    <Rotate3D className="h-3.5 w-3.5" /> 360°
                  </span>
                </span>
              </button>
            )}
            {gallery.map((image, index) => (
              <button
                key={`${product.id}-${image.label}`}
                onClick={() => {
                  setActive(index);
                  setShow360(false);
                }}
                className={`rounded-xl border p-2 bg-card transition ${!show360 && active === index ? "border-primary shadow-soft" : "border-border hover:bg-muted"}`}
              >
                <img
                  src={image.src}
                  alt={image.label}
                  className="aspect-square w-full object-contain"
                  style={{ objectPosition: image.position ?? "center" }}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
          <h1 className="font-display text-4xl md:text-5xl mt-2">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.tagline}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl">{PRICE} lei</span>
            <span className="text-sm text-muted-foreground">75 lei/buc de la 2 cutiuțe</span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border bg-card">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="p-2.5 hover:bg-muted rounded-l-full"
                aria-label="Scade"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-medium tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                className="p-2.5 hover:bg-muted rounded-r-full"
                aria-label="Crește"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                addToCart(product.id, qty);
                notifyAddedToCart(product.name, qty, () => navigate({ to: "/comanda" }));
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
            >
              <ShoppingBag className="w-4 h-4" /> Adaugă în coș
            </button>
            <button
              onClick={() => {
                toggleFavorite(product.id);
                notifyFavorite(product.name, !fav);
              }}
              className={`p-3 rounded-full border ${fav ? "bg-primary/10 border-primary text-primary" : "bg-card hover:bg-muted"}`}
              aria-label="Favorite"
            >
              <Heart className={`w-5 h-5 ${fav ? "fill-current" : ""}`} />
            </button>
          </div>

          <Link
            to="/comanda"
            className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-full border border-primary/40 px-6 py-3 text-sm font-medium hover:bg-primary/5"
          >
            <Gift className="w-4 h-4" /> Finalizează comanda
          </Link>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-xl border p-3">
              <Music className="w-4 h-4" /> Mecanism manual
            </div>
            <div className="flex items-center gap-2 rounded-xl border p-3">
              <Package className="w-4 h-4" /> Fotografia produsului
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-xl">Despre cutiuță</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.story}</p>
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

      {experienceQuery.data?.animation && (
        <ProductAnimation animation={experienceQuery.data.animation} productName={product.name} />
      )}

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl mb-6 text-center">Și acestea îți pot plăcea</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
