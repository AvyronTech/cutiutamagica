import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Eye, Heart, Music2, PackageCheck, Sparkles } from "lucide-react";
import workshopBg from "@/assets/poveste-workshop.webp";
import workshopBgSm from "@/assets/poveste-workshop-sm.webp";
import { EcosystemMarquees } from "@/components/site/EcosystemMarquees";
import { safeJsonLd } from "@/lib/product-discovery";

export const Route = createFileRoute("/despre-noi")({
  component: AboutUs,
  head: () => ({
    meta: [
      { title: "Despre Noi | Povestea Cutiuței Magice" },
      {
        name: "description",
        content:
          "Descoperă povestea Cutiuței Magice și felul în care alegem cutiuțe muzicale din lemn, cu manivelă, pentru daruri care păstrează emoții.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Despre Noi — Cutiuța Magică" },
      {
        property: "og:description",
        content: "Obiecte mici, melodii cunoscute și daruri alese pentru emoții care rămân.",
      },
      { property: "og:url", content: "https://cutiutamagica.eu/despre-noi" },
      { property: "og:image", content: "https://cutiutamagica.eu/poveste-workshop.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/despre-noi" }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: "https://cutiutamagica.eu/despre-noi",
          name: "Despre Noi — Cutiuța Magică",
          inLanguage: "ro-RO",
          isPartOf: { "@id": "https://cutiutamagica.eu/#website" },
          about: { "@id": "https://cutiutamagica.eu/#organization" },
        }),
      },
    ],
  }),
});

function AboutUs() {
  return (
    <article className="about-us-page">
      <div className="about-us-atmosphere" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <header className="about-us-hero">
        <picture aria-hidden>
          <source media="(max-width: 760px)" srcSet={workshopBgSm} />
          <img
            src={workshopBg}
            alt=""
            width={1920}
            height={1280}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="about-us-hero__shade" aria-hidden />
        <div className="about-us-hero__content">
          <p className="scene-eyebrow">Despre Noi</p>
          <h1>
            Obiecte mici.
            <br />
            <em>Emoții care rămân.</em>
          </h1>
          <p>
            Am pornit de la un gest simplu: învârți o manivelă, iar o melodie cunoscută readuce
            aproape un om, un film sau o amintire. De aici începe fiecare poveste pe care o alegem.
          </p>
          <Link className="magic-button" to="/produse">
            Descoperă Colecția <ArrowUpRight aria-hidden />
          </Link>
        </div>
      </header>

      <section className="about-us-story" aria-labelledby="about-us-story-title">
        <div>
          <p className="scene-eyebrow">Povestea Noastră</p>
          <h2 id="about-us-story-title">
            Alegem cutiuțe pe care
            <br />
            <em>ai vrea să le dăruiești.</em>
          </h2>
        </div>
        <div className="about-us-story__copy">
          <p>
            Colecția reunește cutiuțe muzicale compacte, din lemn, cu mecanism manual. Le prezentăm
            prin imagini clare, detalii concrete și informații utile, ca alegerea să fie simplă și
            sinceră.
          </p>
          <p>
            Pentru noi, produsul este doar începutul. Contează momentul în care se deschide capacul,
            prima rotire a manivelei și persoana căreia îi este oferită cutiuța.
          </p>
          <div className="about-us-story__notes" aria-label="Pe scurt despre Cutiuța Magică">
            <span>
              <strong>Mică în palmă</strong>
              <small>aleasă pentru un moment mare</small>
            </span>
            <span>
              <strong>Manuală</strong>
              <small>fără baterii și fără aplicație</small>
            </span>
          </div>
        </div>
      </section>

      <section className="about-us-values" aria-labelledby="about-us-values-title">
        <header className="about-us-values__heading">
          <div>
            <p className="scene-eyebrow">
              <Sparkles size={14} aria-hidden /> Ce păstrăm important
            </p>
            <h2 id="about-us-values-title">Căldura poveștii, claritatea alegerii.</h2>
          </div>
          <p>
            Vrem ca drumul de la prima melodie ascultată până la deschiderea coletului să fie
            simplu, atent și lipsit de surprize neplăcute.
          </p>
        </header>
        <div className="about-us-values__grid">
          <article>
            <Heart aria-hidden />
            <span>01</span>
            <h3>Alegere cu sens</h3>
            <p>Fiecare temă este aleasă pentru un fan, un colecționar sau un om drag.</p>
          </article>
          <article>
            <Music2 aria-hidden />
            <span>02</span>
            <h3>Magie mecanică</h3>
            <p>Melodia pornește din gestul tău, printr-un mecanism manual, fără baterii.</p>
          </article>
          <article>
            <Eye aria-hidden />
            <span>03</span>
            <h3>Detalii înainte de comandă</h3>
            <p>Arătăm imaginile, dimensiunile și audiția disponibile pentru fiecare model.</p>
          </article>
          <article>
            <PackageCheck aria-hidden />
            <span>04</span>
            <h3>Grijă până la livrare</h3>
            <p>Pregătim comanda atent și explicăm transparent opțiunile și termenele.</p>
          </article>
        </div>
      </section>

      <EcosystemMarquees />

      <section className="about-us-closing">
        <p className="scene-eyebrow">Alege Povestea</p>
        <h2>O melodie poate spune atât de mult.</h2>
        <div>
          <Link className="magic-button" to="/produse">
            Vezi Cutiuțele <ArrowUpRight aria-hidden />
          </Link>
          <Link className="magic-button magic-button--outline" to="/personalizeaza">
            Personalizează Acum
          </Link>
        </div>
      </section>
    </article>
  );
}
