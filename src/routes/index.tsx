import { ReviewCarousel } from "@/components/site/ReviewCarousel";
import { getPublicReviews } from "@/lib/reviews.functions";
import { HeroWorld, HeroStoryBridge, HeroMechanismHalo } from "@/components/site/HeroWorld";
import { SceneAtmosphere } from "@/components/site/SceneAtmosphere";
import { BrandMark } from "@/components/site/BrandMark";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Sparkles } from "lucide-react";
import { isAvailable } from "@/data/products";
import { ProductCarouselSection } from "@/components/site/ProductCarouselSection";
import { ConnectSection } from "@/components/site/ConnectSection";
import { FloatingContacts } from "@/components/site/FloatingContacts";
import { RotatingSpotlight } from "@/components/site/RotatingSpotlight";
import { UpcomingCollection } from "@/components/site/UpcomingCollection";
import { PersonalizationSpotlight } from "@/components/site/PersonalizationSpotlight";
import { CompactReturn } from "@/components/site/CompactReturn";
import { HeroProductRotator } from "@/components/site/HeroProductRotator";
import { ChristmasDrop } from "@/components/site/ChristmasDrop";
import { GiftCalendarSpotlight } from "@/components/site/GiftCalendarSpotlight";
import { MagicRewardsSpotlight } from "@/components/site/MagicRewardsSpotlight";
import { getPublicMagicRewards } from "@/lib/magic-rewards.functions";
import { collectionProducts } from "@/lib/collections";
import { useShop } from "@/store/shop";
import bgEmotie from "@/assets/bg-emotie.webp";
import { seoHead } from "@/lib/seo-head";
import { productPath } from "@/lib/product-url";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    const [reviews, rewards] = await Promise.all([
      getPublicReviews({ data: { slug: null } }),
      getPublicMagicRewards(),
    ]);
    return { reviews, rewards };
  },
  head: () =>
    seoHead({
      title: "Cutiuța Magică — cutiuțe muzicale, cadouri cu poveste",
      description:
        "O cutiuță mică. O emoție care rămâne. Descoperă cutiuțe muzicale din lemn cu manivelă, melodii îndrăgite și cadouri cu poveste.",
      path: "/",
      image: "/produse/hp-keeper/1.webp",
      imageAlt: "Cutiuță muzicală din lemn cu manivelă, pregătită pentru un cadou",
    }),
});

function Index() {
  const { products } = useShop();
  const { reviews, rewards } = Route.useLoaderData();
  const heroProducts = products
    .filter(isAvailable)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const upcoming = products.filter((p) => !isAvailable(p));
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://cutiutamagica.eu/#featured-products",
    name: "Cutiuțe muzicale disponibile",
    numberOfItems: heroProducts.length,
    itemListElement: heroProducts.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://cutiutamagica.eu${productPath(product.id)}`,
      item: {
        "@type": "Product",
        "@id": `https://cutiutamagica.eu${productPath(product.id)}#product`,
        name: product.name,
        image: new URL(product.image, "https://cutiutamagica.eu").href,
        sku: product.sku,
        brand: { "@type": "Brand", name: product.brand || "Cutiuța Magică" },
        offers:
          product.price == null
            ? undefined
            : {
                "@type": "Offer",
                price: product.price,
                priceCurrency: "RON",
                availability: "https://schema.org/InStock",
                url: `https://cutiutamagica.eu${productPath(product.id)}`,
              },
      },
    })),
  };
  return (
    <div className="magic-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema).replaceAll("<", "\\u003c"),
        }}
      />
      <HeroWorld>
        <section
          id="inceput"
          data-world="story"
          className="magic-hero"
          aria-labelledby="hero-heading"
        >
          <SceneAtmosphere />
          <div className="hero-magic-ambience" aria-hidden>
            <span className="hero-magic-orbit" />
            <span className="hero-magic-staff">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="hero-magic-glint hero-magic-glint--one">✦</span>
            <span className="hero-magic-glint hero-magic-glint--two">✧</span>
            <span className="hero-magic-glint hero-magic-glint--three">·</span>
          </div>
          <div className="magic-hero-inner">
            <div className="hero-copy">
              <p className="scene-eyebrow">
                <span className="tiny-star">✧</span> Lemn. Manivelă. Melodie.
              </p>
              <h1 id="hero-heading">
                <span className="hero-solar-line">O cutiuță mică.</span>
                <br />
                <em className="hero-solar-line">O lume care cântă.</em>
              </h1>
              <p className="hero-description">
                Deschizi capacul. Învârți manivela. Și o melodie te duce aproape de cineva drag, de
                o amintire, de lumea ta.
              </p>
              <div className="hero-actions">
                <a
                  href="#povesti"
                  className="magic-button"
                  aria-label="Găsește cutiuța ta — vezi poveștile"
                >
                  Găsește cutiuța ta
                  <ArrowUpRight size={17} />
                </a>
              </div>
              <p className="hero-footnote">
                Cutiuțe muzicale din lemn · mecanism manual · fără baterii
              </p>
            </div>
            <div className="hero-object">
              <HeroMechanismHalo />
              <span className="hero-object-kicker">O mică lume, gata să fie descoperită</span>
              {heroProducts.length ? (
                <HeroProductRotator products={heroProducts} />
              ) : (
                <div className="hero-photo hero-photo--empty" aria-hidden="true">
                  <BrandMark className="h-2/3 w-2/3" />
                </div>
              )}
              <Link
                to="/despre-cutiuta"
                className="hero-about"
                aria-label="Despre cutiuță — descoperă mecanismul și povestea"
              >
                <span className="hero-about-spark" aria-hidden="true">
                  <Sparkles size={19} />
                </span>
                <span>
                  <small>Dincolo de capac</small>
                  <strong>Despre</strong>
                </span>
                <ArrowUpRight size={19} />
              </Link>
            </div>
          </div>
          <a className="hero-scroll" href="#povesti">
            Intră în poveste <ArrowDown size={15} />
          </a>
        </section>
        <HeroStoryBridge />
        <ProductCarouselSection
          id="povesti"
          scene="story"
          number="01"
          eyebrow="Pentru cei care cred în povești"
          title="Descoperă povestea."
          description="Universuri pe care le iubești, păstrate într-o cutiuță. Alege melodia care te duce înapoi."
          sharedWorld
          spotlight={<RotatingSpotlight products={collectionProducts(products, "story")} />}
        />
        <ProductCarouselSection
          id="emotii"
          scene="emotion"
          number="02"
          eyebrow="Pentru cineva care înseamnă totul"
          title="Trăiește emoția."
          description="Uneori, «mă gândesc la tine» încape într-o melodie. Un dar mic, cu un loc mare în suflet."
          bgImage={bgEmotie}
          spotlight={<RotatingSpotlight products={collectionProducts(products, "emotion")} />}
        />
        <ProductCarouselSection
          id="dedicate"
          scene="dedicated"
          number="03"
          eyebrow="Pentru micile lumi ale fiecăruia"
          title="Cutiuțe dedicate."
          description="Pentru iubitorii de pisici, de mister și de lucruri care îi reprezintă. Un cadou atât de ei."
          bgImage="/scenes/dedicated.webp"
          spotlight={<RotatingSpotlight products={collectionProducts(products, "dedicated")} />}
        />
        <PersonalizationSpotlight />
        <section className="story-invitation" data-world="dedicated">
          <p className="scene-eyebrow">Dincolo de capac</p>
          <h2>
            Cum prinde viață
            <br />
            <em>o melodie?</em>
          </h2>
          <p>Lemn gravat. Un mecanism mic. Și gestul tău, care le pune în mișcare.</p>
          <Link className="magic-button magic-button--outline" to="/despre-cutiuta">
            Intră în cutiuță
            <ArrowUpRight size={17} />
          </Link>
        </section>
        <UpcomingCollection products={upcoming} />
        <ChristmasDrop />
        <ReviewCarousel data={reviews} />
        <GiftCalendarSpotlight />
        <section className="landing-faq" data-world="atelier" aria-labelledby="faq-heading">
          <p className="scene-eyebrow">Lucrurile simple, explicate</p>
          <h2 id="faq-heading">
            Puțin lemn.
            <br />
            <em>Multă magie.</em>
          </h2>
          <div>
            {[
              [
                "Cum începe melodia?",
                "Rotești ușor manivela laterală. Mecanismul cântă cât timp o învârți, fără baterii și fără încărcare.",
              ],
              [
                "Cât de mare este cutiuța?",
                "Este un obiect compact, care încape în palmă. Dimensiunile exacte ale fiecărui model sunt în pagina lui.",
              ],
              [
                "Pot asculta înainte să aleg?",
                "În pagina produsului găsești butonul de audiție atunci când este disponibilă înregistrarea acelei cutiuțe.",
              ],
              [
                "Este potrivită pentru copii?",
                "Modelele prezentate sunt obiecte decorative și de colecție, nu jucării. Verifică recomandarea de vârstă și detaliile fiecărui produs.",
              ],
              [
                "Cât durează transportul?",
                "Cutiuțele standard ajung, de regulă, în 2–3 zile lucrătoare. Pentru modelele speciale și personalizate, termenul estimat este de 4–7 zile lucrătoare, după confirmarea detaliilor.",
              ],
              [
                "Cum pot plăti?",
                "În checkout alegi metoda disponibilă: ramburs la curier, cu verificarea coletului acolo unde serviciul este disponibil, sau online cu cardul prin pagina securizată a procesatorului. Totalul este afișat înainte de confirmare.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="landing-about-entry" aria-labelledby="landing-about-title">
          <div>
            <p className="scene-eyebrow">Cine se află în spatele poveștii</p>
            <h2 id="landing-about-title">Alegem melodii care apropie oamenii.</h2>
            <p>
              Descoperă cum alegem cutiuțele, ce detalii contează pentru noi și de ce fiecare
              comandă începe cu o emoție, nu cu un produs.
            </p>
          </div>
          <Link to="/despre-noi" className="magic-button magic-button--outline">
            Despre noi <ArrowUpRight size={17} aria-hidden />
          </Link>
        </section>
        <MagicRewardsSpotlight program={rewards.program} activities={rewards.activities} />
        <ConnectSection />
        <CompactReturn />
      </HeroWorld>
      <FloatingContacts />
    </div>
  );
}
