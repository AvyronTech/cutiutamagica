import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/site/BrandMark";
import { safeJsonLd } from "@/lib/product-discovery";
const AssemblyStory = lazy(() => import("@/components/site/AssemblyStory"));
export const Route = createFileRoute("/despre-cutiuta")({
  component: AboutBox,
  head: () => ({
    meta: [
      { title: "Despre cutiuță — cum prinde viață o melodie | Cutiuța Magică" },
      {
        name: "description",
        content:
          "Descoperă cutiuța muzicală din lemn, de la capacul gravat la mecanismul cu manivelă. O poveste despre gesturi mici și emoții care rămân.",
      },
      { property: "og:title", content: "Despre cutiuță — mecanism, manivelă și melodie" },
      {
        property: "og:description",
        content:
          "Descoperă cum funcționează cutiuța muzicală din lemn și ce o transformă într-un cadou cu poveste.",
      },
      { property: "og:url", content: "https://cutiutamagica.eu/despre-cutiuta" },
      { property: "og:image", content: "https://cutiutamagica.eu/produse/hp-keeper/1.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/despre-cutiuta" }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "@id": "https://cutiutamagica.eu/despre-cutiuta#page",
          url: "https://cutiutamagica.eu/despre-cutiuta",
          name: "Despre cutiuță — mecanism, manivelă și melodie",
          description:
            "Cum funcționează o cutiuță muzicală din lemn cu manivelă și cum o păstrezi în colecția ta.",
          inLanguage: "ro-RO",
          isPartOf: { "@id": "https://cutiutamagica.eu/#website" },
        }),
      },
    ],
  }),
});
function AboutBox() {
  return (
    <div className="about-box">
      <header className="about-opening">
        <p className="scene-eyebrow">Despre cutiuță</p>
        <h1>
          O cutiuță mică.
          <br />
          <em>Un întreg univers.</em>
        </h1>
        <p>
          Intră în atelierul poveștii. Derulează ca să descoperi cutiuța, piesă cu piesă. La final,
          apasă manivela: tu îi dai viață.
        </p>
        <a href="#constructie" className="scene-link">
          Derulează și descoperă ↓
        </a>
        <Link to="/produse" className="about-skip">
          Mergi direct la cutiuțe <ArrowUpRight size={14} />
        </Link>
      </header>
      <Suspense
        fallback={
          <div className="assembly-placeholder">
            <BrandMark className="w-48 h-48" />
            <p>Se conturează povestea…</p>
          </div>
        }
      >
        <AssemblyStory />
      </Suspense>
      <section className="about-details">
        <p className="scene-eyebrow">Din atelierul poveștii, în universul tău</p>
        <h2>
          Încape în palmă.
          <br />
          <em>Rămâne în amintire.</em>
        </h2>
        <div className="about-detail-grid">
          <article>
            <span>01</span>
            <h3>Detalii care merită privite</h3>
            <p>
              Textura lemnului, liniile capacului, strălucirea discretă a mecanismului. O cutiuță se
              descoperă de aproape, cu răbdarea cu care ai privi piesele pe masa unui atelier.
              Materialele, dimensiunile și finisajele sunt prezentate pentru fiecare model.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Un mecanism, un mic ritual</h3>
            <p>
              Deschizi capacul. Învârți manivela ușor, constant, fără să o forțezi. Cilindrul atinge
              lamelele metalice, iar ritmul mâinii devine ritmul melodiei. Fără baterii. Păstrează
              cutiuța ferită de umezeală și șterge lemnul cu o lavetă moale, uscată.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Pentru fani și colecționari</h3>
            <p>
              Lângă cartea preferată, într-o colecție de lumi îndrăgite sau într-un cadou ales cu
              grijă. Caută tema în care te regăsești și ascultă fragmentul disponibil în pagina
              cutiuței. Povestea ei începe cu ceea ce înseamnă pentru tine.
            </p>
          </article>
        </div>
        <Link className="magic-button" to="/produse">
          Găsește povestea ta
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <section className="about-team">
        <p className="scene-eyebrow">Puțin despre noi</p>
        <h2>
          Alegem obiecte mici
          <br />
          <em>pentru emoții mari.</em>
        </h2>
        <p>
          Cutiuța Magică reunește cutiuțe muzicale din lemn, cu mecanism manual și povești
          familiare. Ne dorim să le poți descoperi în detaliu și să alegi cu încredere un cadou care
          înseamnă ceva.
        </p>
        <Link className="scene-link" to="/produse">
          Descoperă colecția
          <ArrowUpRight size={15} />
        </Link>
      </section>
    </div>
  );
}
