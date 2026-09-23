import { ProductReviews } from "@/components/site/ProductReviews";
import { getPublicReviews } from "@/lib/reviews.functions";
import { ProductDiscovery } from "@/components/site/ProductDiscovery";
import { safeJsonLd } from "@/lib/product-discovery";
import { ProductWorld } from "@/components/site/ProductWorld";
import { animateIntoCart } from "@/lib/cart-flight";
import { ProductInterest } from "@/components/site/ProductInterest";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  Music,
  Package,
  Gift,
  Sparkles,
  Minus,
  Plus,
  Rotate3D,
  Hourglass,
} from "lucide-react";
import { isAvailable, PRICE, MAX_QTY } from "@/data/products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { catalogProducts } from "@/lib/catalog-products";
import { useShop } from "@/store/shop";
import { ProductImage } from "@/components/site/ProductImage";
import { ProductLightbox } from "@/components/site/ProductLightbox";
import { playTick } from "@/lib/sound";
import { notifyAddedToCart } from "@/lib/notify";
import { ProductCard } from "@/components/site/ProductCard";
import {
  ProductAnimation,
  ProductAudioOverlay,
  ProductSpinViewer,
  useProductExperience,
} from "@/components/site/ProductMediaExperience";

export const Route = createFileRoute("/produs/$id")({
  component: ProductPage,
  loader: async ({ params }) => {
    const pricing = await getStorePricing();
    const product = catalogProducts(pricing.catalog).find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product, reviews: await getPublicReviews({ data: { slug: params.id } }) };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    const url = `https://cutiutamagica.eu/produs/${encodeURIComponent(params.id)}`;
    const image = loaderData.product.image.startsWith("http")
      ? loaderData.product.image
      : `https://cutiutamagica.eu${loaderData.product.image}`;
    const price =
      !isAvailable(loaderData.product) || loaderData.product.price == null
        ? undefined
        : String(loaderData.product.price);
    const absolute = (src: string) =>
      src.startsWith("http") ? src : `https://cutiutamagica.eu${src}`;
    const images = [
      ...new Set([image, ...loaderData.product.gallery.map((entry) => absolute(entry.src))]),
    ];
    const inStock = isAvailable(loaderData.product);
    const description =
      loaderData.product.seoDescription ||
      `${loaderData.product.tagline} Cutiuță muzicală din lemn, cu manivelă și mecanism manual${loaderData.product.melody ? `, melodia ${loaderData.product.melody}` : ""}.`;
    return {
      meta: [
        { title: loaderData.product.seoTitle || `${loaderData.product.name} — Cutiuța Magică` },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:image:alt", content: loaderData.product.name },
        { property: "og:title", content: loaderData.product.name },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(price
          ? [
              { property: "product:price:amount", content: price },
              { property: "product:price:currency", content: "RON" },
            ]
          : []),
        { property: "product:availability", content: inStock ? "in stock" : "out of stock" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${url}#product`,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            name: loaderData.product.name,
            sku: loaderData.product.sku,
            image: images,
            description: [loaderData.product.description, loaderData.product.discovery?.intro]
              .filter(Boolean)
              .join(" "),
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
            offers: price
              ? {
                  "@type": "Offer",
                  price,
                  priceCurrency: "RON",
                  availability: inStock
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
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
                }
              : undefined,
          }),
        },
        {
          type: "application/ld+json",
          children: safeJsonLd({
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
  const { product: loadedProduct, reviews } = Route.useLoaderData();
  const { addToCart, products, totalQty } = useShop();
  const product = products.find((p) => p.id === loadedProduct.id) ?? {
    ...loadedProduct,
    availability: "out_of_stock" as const,
  };
  const navigate = useNavigate();
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
      products
        .filter((p) => p.id !== product.id)
        // Întâi modelele disponibile acum, apoi cele din aceeași categorie.
        .sort(
          (a, b) =>
            Number(isAvailable(b)) - Number(isAvailable(a)) ||
            Number(b.category === product.category) - Number(a.category === product.category),
        )
        .slice(0, 4),
    [product.id, product.category, products],
  );
  const gallery = product.gallery;
  const available = isAvailable(product);
  const [zoomOpen, setZoomOpen] = useState(false);
  const currentImage = gallery[active] ?? gallery[0] ?? { src: product.image, label: product.name };
  const spin = experienceQuery.data?.spin360 ?? null;
  const has360 = Boolean(
    spin &&
    ((spin.spin_type === "image_sequence" && spin.frames.length >= 2) ||
      (spin.spin_type === "turntable_video" && spin.primaryMediaUrl)),
  );
  const spinThumb = spin ? (spin.coverUrl ?? spin.frames[0]?.url ?? null) : null;

  return (
    <ProductWorld product={product}>
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
              <AnimatePresence mode="wait" initial={false}>
                <motion.button
                  type="button"
                  key={currentImage.src}
                  onClick={() => setZoomOpen(true)}
                  aria-label="Vezi fotografia mărită"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-4 cursor-zoom-in"
                  style={{ transform: "translateZ(36px)" }}
                >
                  <ProductImage
                    src={currentImage.src}
                    alt={`${product.name} — ${currentImage.label}`}
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 768px) 92vw, 620px"
                    className="h-full w-full object-contain"
                    style={{ objectPosition: currentImage.position ?? "center" }}
                  />
                </motion.button>
              </AnimatePresence>
              {/* Halou cald peste fotografie: dă senzația de lumină de lumânare, fără să acopere produsul. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(85%_65%_at_50%_15%,oklch(0.95_0.12_85/0.14),transparent_62%)]"
                style={{ transform: "translateZ(50px)" }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[color:var(--gold)]/25"
              />
              {product.melody ? (
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
                <Sparkles className="w-3 h-3" /> Atinge fotografia pentru vedere mărită
              </>
            )}
          </p>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
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
                  playTick();
                }}
                className={`rounded-xl border p-2 bg-card transition ${!show360 && active === index ? "border-primary shadow-soft" : "border-border hover:bg-muted"}`}
              >
                <ProductImage
                  src={image.src}
                  alt={image.label}
                  sizes="120px"
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
          {experienceQuery.data?.audio && (
            <ProductAudioOverlay
              key={experienceQuery.data.audio.media_id}
              audio={experienceQuery.data.audio}
            />
          )}

          {available ? (
            <div className="mt-6 flex items-baseline gap-3">
              {product.originalPrice != null && product.originalPrice > (product.price ?? 0) && (
                <del className="text-muted-foreground">{product.originalPrice} lei</del>
              )}
              <span className="font-display text-4xl">{product.price ?? PRICE} lei</span>
              <span className="text-sm text-muted-foreground">preț pe cutiuță</span>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-4">
              <p className="inline-flex items-center gap-2 font-display text-2xl">
                <Hourglass className="h-5 w-5 text-[color:var(--gold)]" aria-hidden />
                {product.availability === "out_of_stock"
                  ? "Revine în colecție"
                  : "Disponibilă în curând"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pregătim acest model pentru magazin. Între timp poți alege una dintre cutiuțele
                disponibile acum.
              </p>
              <div className="mt-4">
                <ProductInterest product={product} />
              </div>
              <Link
                to="/produse"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Vezi cutiuțele disponibile
              </Link>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            {available && (
              <>
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
                  onClick={(e) => {
                    const added = addToCart(product.id, qty);
                    animateIntoCart(e.currentTarget, product.image, added);
                    notifyAddedToCart(product.name, added, () => navigate({ to: "/comanda" }));
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
                >
                  <ShoppingBag className="w-4 h-4" /> Adaugă în coș
                </button>
              </>
            )}
          </div>

          {available && totalQty > 0 && (
            <Link
              to="/comanda"
              className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-full border border-primary/40 px-6 py-3 text-sm font-medium hover:bg-primary/5"
            >
              <Gift className="w-4 h-4" /> Finalizează comanda
            </Link>
          )}

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

      <ProductDiscovery product={product} />
      <ProductReviews key={product.id} slug={product.id} name={product.name} initial={reviews} />

      {experienceQuery.data?.animation && (
        <ProductAnimation animation={experienceQuery.data.animation} productName={product.name} />
      )}

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl mb-6 text-center">Și acestea îți pot plăcea</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} variant="solid" />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {zoomOpen && (
          <ProductLightbox
            images={gallery}
            index={active}
            productName={product.name}
            onClose={() => setZoomOpen(false)}
            onIndexChange={setActive}
          />
        )}
      </AnimatePresence>
    </ProductWorld>
  );
}
