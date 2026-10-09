import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, ImagePlus, Music2, Palette, Sparkles } from "lucide-react";
import { seoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/personalizeaza")({
  component: PersonalizeazaComingSoon,
  head: () =>
    seoHead({
      title: "Atelierul de personalizare — în curând | Cutiuța Magică",
      description:
        "Pregătim un atelier pentru cutiuțe muzicale personalizate cu melodie, finisaj și imagine aleasă pentru povestea ta.",
      path: "/personalizeaza",
      image: "/scenes/personalization-box-v2.webp",
      imageAlt: "Atelierul de personalizare Cutiuța Magică, în pregătire",
      robots: "noindex, nofollow",
    }),
});

function PersonalizeazaComingSoon() {
  return (
    <section className="personalization-coming-page" aria-labelledby="personalization-coming-title">
      <div className="personalization-coming-page__stars" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="personalization-coming-page__card">
        <span className="personalization-coming-page__icon" aria-hidden>
          <Sparkles />
        </span>
        <p className="catalog-eyebrow">Atelier în pregătire</p>
        <h1 id="personalization-coming-title">
          Povestea ta va putea cânta <em>în curând.</em>
        </h1>
        <p>
          Pregătim fiecare detaliu înainte să deschidem ușa: melodie, culoare și imaginea care va
          transforma cutiuța într-un dar numai al tău.
        </p>
        <div className="personalization-coming-page__features" aria-label="Ce pregătim">
          <span>
            <Music2 aria-hidden /> Melodia ta
          </span>
          <span>
            <Palette aria-hidden /> Două finisaje
          </span>
          <span>
            <ImagePlus aria-hidden /> Imagine pe capac
          </span>
        </div>
        <div className="personalization-coming-page__actions">
          <Link className="magic-button" to="/produse">
            <ArrowLeft aria-hidden /> Descoperă colecția
          </Link>
          <Link className="personalization-coming-page__account" to="/cont">
            <Bell aria-hidden /> Creează cont pentru noutăți
          </Link>
        </div>
      </div>
    </section>
  );
}
