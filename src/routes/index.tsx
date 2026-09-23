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
import { CompactReturn } from "@/components/site/CompactReturn";
import { ProductImage } from "@/components/site/ProductImage";
import { collectionProducts } from "@/lib/collections";
import { useShop } from "@/store/shop";
import bgEmotie from "@/assets/bg-emotie.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  loader: () => getPublicReviews({ data: { slug: null } }),
  head: () => ({
    meta: [
      { title: "Cutiuța Magică — cutiuțe muzicale, cadouri cu poveste" },
      {
        name: "description",
        content:
          "O cutiuță mică. O emoție care rămâne. Descoperă cutiuțe muzicale din lemn cu manivelă, melodii îndrăgite și cadouri cu poveste.",
      },
      { property: "og:title", content: "Cutiuța Magică — o melodie, o amintire" },
      {
        property: "og:description",
        content:
          "Cutiuțe muzicale din lemn cu manivelă: cadouri pentru fani, colecționari și oameni dragi. Alege după melodie, temă și ocazie.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:image", content: "https://cutiutamagica.eu/produse/hp-keeper/1.webp" },
      { property: "og:url", content: "https://cutiutamagica.eu/" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/" }],
  }),
});

function Index() {
  const { products } = useShop();
  const reviews = Route.useLoaderData();
  const hero =
    products.find((p) => p.featured && isAvailable(p)) ??
    products.find((p) => p.id === "hp-keeper" && isAvailable(p)) ??
    products.find(isAvailable);
  const upcoming = products.filter((p) => !isAvailable(p));
  return (
    <div className="magic-landing">
      <HeroWorld>
        <section
          id="inceput"
          data-world="story"
          className="magic-hero"
          aria-labelledby="hero-heading"
        >
          <SceneAtmosphere />
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
                <a href="#povesti" className="magic-button">
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
              {hero ? (
                <Link
                  to="/produs/$id"
                  params={{ id: hero.id }}
                  aria-label={`Descoperă ${hero.name}`}
                >
                  <div className="hero-photo" data-magic-card>
                    <ProductImage
                      src={hero.gallery?.[0]?.src ?? hero.image}
                      alt={hero.name}
                      loading="eager"
                      fetchPriority="high"
                      sizes="(max-width: 767px) 78vw, (max-width: 1200px) 42vw, 470px"
                      width={800}
                      height={800}
                    />
                    <span className="hero-photo-caption">
                      O poveste în palma ta <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
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
        <CompactReturn />
        <ConnectSection />
        <ReviewCarousel data={reviews} />
      </HeroWorld>
      <FloatingContacts />
    </div>
  );
}
