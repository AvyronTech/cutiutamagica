import { ProductReviews } from "@/components/site/ProductReviews";
import { getPublicReviews } from "@/lib/reviews.functions";
import { ProductDiscovery } from "@/components/site/ProductDiscovery";
import { safeJsonLd } from "@/lib/product-discovery";
import { ProductWorld } from "@/components/site/ProductWorld";
import { animateIntoCart } from "@/lib/cart-flight";
import { ProductInterest } from "@/components/site/ProductInterest";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
import { isAvailable, MAX_QTY } from "@/data/products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { catalogProducts } from "@/lib/catalog-products";
import { useShop } from "@/store/shop";
import { ProductImage } from "@/components/site/ProductImage";
import { ProductPrice } from "@/components/site/ProductPrice";
import { ProductLightbox } from "@/components/site/ProductLightbox";
import { playTick } from "@/lib/sound";
import { notifyAddedToCart } from "@/lib/notify";
import { ProductCardCarousel } from "@/components/site/ProductCardCarousel";
import { ProductShare } from "@/components/site/ProductShare";
import { LimitedEditionBadge } from "@/components/site/LimitedEditionBadge";
import {
  ProductAnimation,
  ProductAudioOverlay,
  ProductAudioUnavailable,
  ProductSpinViewer,
  useProductExperience,
} from "@/components/site/ProductMediaExperience";
import { ProductDeliveryEstimate } from "@/components/site/ProductDeliveryEstimate";
import { ProductMobileBuyBar } from "@/components/site/ProductMobileBuyBar";
import { trackGrowthEvent } from "@/lib/growth-events";
import { seoHead } from "@/lib/seo-head";
import { productIdFromPublicSlug, productPath } from "@/lib/product-url";

export const Route = createFileRoute("/produs-cutiuta-muzicala-{$slug}")({
  component: ProductPage,
  loader: async ({ params }) => {
    const pricing = await getStorePricing();
    const productId = productIdFromPublicSlug(params.slug);
    const product = catalogProducts(pricing.catalog).find((p) => p.id === productId);
    if (!product) throw notFound();
    if (productPath(product.id) !== `/produs-cutiuta-muzicala-${params.slug}`) throw notFound();
    return { product, reviews: await getPublicReviews({ data: { slug: product.id } }) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const path = productPath(loaderData.product.id);
    const url = `https://cutiutamagica.eu${path}`;
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
    const seo = seoHead({
      title: loaderData.product.seoTitle || `${loaderData.product.name} | Cutiuța Magică`,
      description,
      path,
      image,
      imageAlt: `${loaderData.product.name} — fotografie de produs`,
      type: "product",
    });
    return {
      ...seo,
      meta: [
        ...seo.meta,
        ...(price
          ? [
              { property: "product:price:amount", content: price },
              { property: "product:price:currency", content: "RON" },
            ]
          : []),
        { property: "product:availability", content: inStock ? "in stock" : "out of stock" },
      ],
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
            gtin: loaderData.product.gtin,
            mpn: loaderData.product.mpn,
            image: images,
            description: [loaderData.product.description, loaderData.product.discovery?.intro]
              .filter(Boolean)
              .join(" "),
            keywords: loaderData.product.searchTerms.join(", "),
            category: loaderData.product.category,
            material: "Lemn",
            brand: { "@type": "Brand", name: loaderData.product.brand || "Cutiuța Magică" },
            audience: loaderData.product.discovery?.audience
              ? {
                  "@type": "Audience",
                  audienceType: loaderData.product.discovery.audience,
                }
              : undefined,
            additionalProperty: [
              { "@type": "PropertyValue", name: "Mecanism", value: "Manual, cu manivelă" },
              ...(loaderData.product.melody
                ? [{ "@type": "PropertyValue", name: "Melodie", value: loaderData.product.melody }]
                : []),
              ...(loaderData.product.limitedEdition
                ? [
                    {
                      "@type": "PropertyValue",
                      name: "Ediție",
                      value: `Limited Edition — serie de ${loaderData.product.limitedEdition.totalUnits} bucăți`,
                    },
                  ]
                : []),
            ],
            url,
            aggregateRating:
              loaderData.reviews.total > 0 && loaderData.reviews.average
                ? {
                    "@type": "AggregateRating",
                    ratingValue: loaderData.reviews.average,
                    reviewCount: loaderData.reviews.total,
                    bestRating: 5,
                    worstRating: 1,
                  }
                : undefined,
            review: loaderData.reviews.reviews.slice(0, 10).map((review) => ({
              "@type": "Review",
              author: { "@type": "Person", name: review.displayName },
              reviewBody: review.body,
              inLanguage: review.language,
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: 5,
                worstRating: 1,
              },
            })),
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
                  seller: { "@id": "https://cutiutamagica.eu/#organization" },
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
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [show360, setShow360] = useState(false);
  const gallerySwipe = useRef<{ x: number; y: number; at: number } | null>(null);
  const suppressGalleryClick = useRef(false);
  const experienceQuery = useProductExperience(product.id);

  const addProductToCart = (event: React.MouseEvent<HTMLButtonElement>, quantity = qty) => {
    const added = addToCart(product.id, quantity);
    animateIntoCart(event.currentTarget, product.image, added);
    notifyAddedToCart(product.name, added, () => navigate({ to: "/comanda" }));
  };

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
  const moveGallery = (delta: number) => {
    if (gallery.length < 2) return;
    setActive((current) => (current + delta + gallery.length) % gallery.length);
    setShow360(false);
    playTick();
  };

  return (
    <ProductWorld product={product}>
      <div className="product-detail-shell max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-12 items-start">
        <div className="product-detail-gallery perspective-1000">
          {show360 && spin && has360 ? (
            <div className="relative overflow-hidden rounded-2xl shadow-warm">
              <ProductSpinViewer spin={spin} productName={product.name} />
              <LimitedEditionBadge edition={product.limitedEdition} surface="detail" />
            </div>
          ) : (
            <motion.div className="product-main-visual relative overflow-hidden shadow-warm bg-card">
              <AnimatePresence mode="wait" initial={false}>
                <motion.button
                  type="button"
                  key={currentImage.src}
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse") return;
                    gallerySwipe.current = {
                      x: event.clientX,
                      y: event.clientY,
                      at: performance.now(),
                    };
                  }}
                  onPointerUp={(event) => {
                    const start = gallerySwipe.current;
                    gallerySwipe.current = null;
                    if (!start || event.pointerType === "mouse") return;
                    const dx = event.clientX - start.x;
                    const dy = event.clientY - start.y;
                    const quick = performance.now() - start.at < 650;
                    if (quick && Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.25) {
                      suppressGalleryClick.current = true;
                      moveGallery(dx < 0 ? 1 : -1);
                    }
                  }}
                  onPointerCancel={() => {
                    gallerySwipe.current = null;
                  }}
                  onClick={() => {
                    if (suppressGalleryClick.current) {
                      suppressGalleryClick.current = false;
                      return;
                    }
                    setZoomOpen(true);
                    trackGrowthEvent("gallery_open", { productSlug: product.id });
                  }}
                  aria-label="Vezi fotografia mărită"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="product-main-visual__trigger absolute inset-0 cursor-zoom-in"
                >
                  <ProductImage
                    src={currentImage.src}
                    alt={`${product.name} — ${currentImage.label}`}
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 768px) 92vw, 620px"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: currentImage.position ?? "center" }}
                  />
                </motion.button>
              </AnimatePresence>
              {/* Halou cald peste fotografie: dă senzația de lumină de lumânare, fără să acopere produsul. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(85%_65%_at_50%_15%,oklch(0.95_0.12_85/0.14),transparent_62%)]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[color:var(--gold)]/25"
              />
              <LimitedEditionBadge edition={product.limitedEdition} surface="detail" />
              {product.melody ? (
                <motion.div className="absolute top-4 left-4 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
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
                <Sparkles className="w-3 h-3" /> Atinge pentru mărire · glisează pentru altă imagine
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
                className={`group relative overflow-hidden rounded-xl border p-0 bg-card transition ${show360 ? "border-[color:var(--gold)] shadow-soft" : "border-border hover:bg-muted"}`}
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
                type="button"
                aria-label={`Afișează imaginea: ${image.label}`}
                aria-pressed={!show360 && active === index}
                onClick={() => {
                  setActive(index);
                  setShow360(false);
                  playTick();
                }}
                className={`overflow-hidden rounded-xl border p-0 bg-card transition ${!show360 && active === index ? "border-primary shadow-soft" : "border-border hover:bg-muted"}`}
              >
                <ProductImage
                  src={image.src}
                  alt={image.label}
                  sizes="120px"
                  className="aspect-square w-full object-cover"
                  style={{ objectPosition: image.position ?? "center" }}
                />
              </button>
            ))}
          </div>

          <article className="product-about-card">
            <p className="catalog-eyebrow">Povestea modelului</p>
            <h2>Despre cutiuță</h2>
            <p>{product.description}</p>
            <p>{product.story}</p>
          </article>
        </div>

        <div className="product-detail-copy">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
          <h1 className="font-display text-4xl md:text-5xl mt-2">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.tagline}</p>
          {available ? (
            <div className="mt-6">
              <ProductPrice product={product} size="detail" tone="light" />
              <span className="mt-1 block text-xs text-muted-foreground">preț pe cutiuță</span>
              {experienceQuery.data?.audio && (
                <ProductAudioOverlay
                  key={experienceQuery.data.audio.media_id}
                  audio={experienceQuery.data.audio}
                  productSlug={product.id}
                />
              )}
              {!experienceQuery.isLoading && !experienceQuery.data?.audio && (
                <ProductAudioUnavailable melody={product.melody} />
              )}
              <ProductDeliveryEstimate />
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

          <div className="product-purchase-actions mt-6">
            {available && (
              <>
                <div
                  className="product-quantity-control"
                  aria-label="Selectează numărul de cutiuțe"
                >
                  <span className="product-quantity-control__label">Bucăți</span>
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Scade cantitatea"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <output aria-live="polite">{qty}</output>
                  <button
                    onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                    aria-label="Crește cantitatea"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={(event) => addProductToCart(event)} className="product-add-button">
                  <span className="product-add-button__icon">
                    <ShoppingBag aria-hidden />
                  </span>
                  <span>
                    <strong>Adaugă în coș</strong>
                    <small>Pregătește povestea</small>
                  </span>
                  <Sparkles className="product-add-button__spark" aria-hidden />
                </button>
              </>
            )}
          </div>

          {available && totalQty > 0 && (
            <Link
              to="/comanda"
              className="product-checkout-link mt-3 inline-flex items-center justify-center gap-2 border border-primary/40 px-4 py-2.5 text-sm font-medium hover:bg-primary/5"
            >
              <Gift className="w-4 h-4" /> Finalizează comanda
            </Link>
          )}

          <ProductShare
            id={product.id}
            name={product.name}
            tagline={product.tagline}
            image={product.image}
          />

          <div className="product-detail-assurances mt-6 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 rounded-xl border p-3">
              <Music className="w-4 h-4" /> Mecanism manual
            </div>
            <div className="flex items-center gap-2 rounded-xl border p-3">
              <Package className="w-4 h-4" /> Fotografia produsului
            </div>
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
      <ProductReviews
        key={product.id}
        slug={product.id}
        name={product.name}
        products={products.map(({ id, name: productName }) => ({ id, name: productName }))}
        initial={reviews}
      />

      {experienceQuery.data?.animation && (
        <ProductAnimation animation={experienceQuery.data.animation} productName={product.name} />
      )}

      {related.length > 0 && (
        <section className="product-related-section max-w-7xl mx-auto px-4">
          <h2 className="font-display text-3xl mb-6 text-center">Și acestea îți pot plăcea</h2>
          <ProductCardCarousel
            products={related}
            ariaLabel="Alte cutiuțe care ți-ar putea plăcea"
            compact
          />
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
      {available && (
        <ProductMobileBuyBar
          product={product}
          audioAvailable={Boolean(experienceQuery.data?.audio)}
          onAdd={(event) => addProductToCart(event, 1)}
        />
      )}
    </ProductWorld>
  );
}
