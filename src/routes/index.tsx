import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Package, BookOpen, Gift, ArrowRight } from "lucide-react";
import { products } from "@/data/products";
import { ProductCarouselSection } from "@/components/site/ProductCarouselSection";
import { ConnectSection } from "@/components/site/ConnectSection";
import { ReviewsStrip } from "@/components/site/ReviewsStrip";
import { FloatingContacts } from "@/components/site/FloatingContacts";
import { SideScrollMagic } from "@/components/site/SideScrollMagic";
import bgPoveste from "@/assets/bg-poveste.jpg";
import bgEmotie from "@/assets/bg-emotie.jpg";
import bgUnice from "@/assets/bg-unice.jpg";



const heroImage = products[0].image;

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Cutiuța Magică — cutiuțe muzicale din lemn autentice" },
      { name: "description", content: "Cutiuțe muzicale din lemn cu fotografii reale și descrieri ample. Transport gratuit peste 250 lei, curier 25 lei sau easybox 12,99 lei. Comandă online." },
      { property: "og:title", content: "Cutiuța Magică — cutiuțe muzicale din lemn" },
      { property: "og:description", content: "Cutiuțe muzicale autentice, gata de dăruit. Transport gratuit peste 250 lei." },
      { property: "og:image", content: heroImage },
      { property: "og:url", content: "https://cutiutamagica.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroImage },
    ],
    links: [
      { rel: "canonical", href: "https://cutiutamagica.lovable.app/" },
      { rel: "preload", as: "image", href: heroImage, fetchpriority: "high" },
    ],
  }),
});


function Index() {
  const hero = products[0];

  const povesteIds = ["lotr-rings", "hp-always", "hp-keeper", "pirates", "starwars-dad"];
  const emotieIds = ["fairy", "kitten", "hp-always", "lotr-rings"];
  const uniceIds = ["pernuta-auto", "set-termos", "pieptene-barba", "suport-telefon", "ceas-buzunar"];

  const byIds = (ids: string[]) => ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is typeof products[number] => Boolean(p));


  return (
    <div>
      {/* HERO — minimal, asymmetric. Cutiuța rămâne vizibilă în dreapta. */}
      <section className="relative overflow-hidden">
        <div className="relative h-[82vh] min-h-[560px] max-h-[820px] w-full">
          <img
            src={hero.image}
            alt={hero.name}
            width={1200}
            height={800}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-[70%_center] md:object-[65%_center]"
          />
          {/* Overlay asimetric: întunecă stânga pentru text, lasă dreapta clară pentru cutiuță */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, oklch(0.18 0.04 40 / 0.92) 0%, oklch(0.2 0.04 40 / 0.78) 28%, oklch(0.22 0.04 40 / 0.38) 55%, oklch(0.22 0.04 40 / 0.1) 75%, oklch(0.22 0.04 40 / 0.35) 100%)",
            }}
          />
          {/* Halou auriu subtil în jurul cutiuței (dreapta) */}
          <div
            aria-hidden
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                "radial-gradient(38% 55% at 72% 52%, oklch(0.85 0.16 75 / 0.18), transparent 65%)",
            }}
          />
          {/* Vignette jos pentru continuitate cu strip-ul de transport */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-40"
            style={{ background: "linear-gradient(180deg, transparent, oklch(0.18 0.04 40 / 0.85))" }}
          />

          <div className="relative h-full max-w-7xl mx-auto px-5 md:px-8 grid grid-cols-1 md:grid-cols-12 items-center text-[color:var(--cream)]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="md:col-span-7 lg:col-span-6 text-left max-w-xl"
            >
              {/* Banner Piesă originală — liquid glass, slim, tematic */}
              <div className="relative inline-flex items-center gap-2 text-[10px] md:text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold)] mb-3 rounded-full pl-3 pr-3.5 py-1 overflow-hidden border border-[color:var(--gold)]/30 bg-white/[0.06] backdrop-blur-2xl shadow-[inset_0_1px_1px_0_oklch(0.95_0.05_90/0.12),0_6px_20px_-10px_oklch(0_0_0/0.5)]">
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,oklch(0.95_0.05_90/0.08)_0%,transparent_55%)]" />
                <span aria-hidden className="relative inline-block w-1 h-1 rounded-full bg-[color:var(--gold)] shadow-[0_0_6px_oklch(0.85_0.18_75/0.9)]" />
                <span className="relative">Piesă originală · Mecanism durabil</span>
              </div>

              <h1 className="font-display text-[2.6rem] sm:text-5xl md:text-[4.4rem] lg:text-[5rem] leading-[0.98] tracking-tight text-balance">
                Cutiuțe muzicale
                <br />
                <span className="gold-text italic">autentice.</span>
              </h1>

              <div className="mt-5 flex items-center gap-3 text-[color:var(--gold)]/80">
                <span aria-hidden className="h-px w-10 bg-[color:var(--gold)]/50" />
                <span className="text-[11px] uppercase tracking-[0.3em]">Lemn · Manivelă · Melodie</span>
              </div>

              <p className="mt-5 text-base md:text-lg text-[color:var(--cream)]/85 max-w-md text-balance">
                O învârtire de manivelă și camera se umple de o melodie care aduce înapoi o emoție dragă.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/produse"
                  className="group relative inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[color:var(--wood-dark)] bg-[linear-gradient(135deg,oklch(0.92_0.09_85)_0%,oklch(0.82_0.13_70)_55%,oklch(0.7_0.16_55)_100%)] border border-[color:var(--gold)]/70 shadow-[0_12px_30px_-10px_oklch(0.55_0.18_45/0.7),inset_0_1px_0_oklch(0.99_0.05_95/0.5)] hover:scale-[1.03] hover:shadow-[0_16px_38px_-10px_oklch(0.55_0.18_45/0.85),inset_0_1px_0_oklch(0.99_0.05_95/0.6)] transition-all overflow-hidden"
                >
                  <span aria-hidden className="pointer-events-none absolute -inset-x-10 -top-10 h-16 bg-[linear-gradient(90deg,transparent,oklch(0.99_0.02_95/0.55),transparent)] blur-md translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-[1100ms]" />
                  <Gift className="w-4 h-4 relative" />
                  <span className="relative font-display tracking-wide text-base">Vezi cutiuțele</span>
                  <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/poveste"
                  className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[color:var(--cream)] bg-[color:var(--cream)]/8 backdrop-blur-md border border-[color:var(--cream)]/30 hover:bg-[color:var(--cream)]/16 hover:border-[color:var(--gold)]/60 transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="font-display tracking-wide text-base">Povestea noastră</span>
                </Link>
              </div>
            </motion.div>

            {/* Dreapta: spațiu rezervat ca să respire cutiuța din imagine */}
            <div className="hidden md:block md:col-span-5 lg:col-span-6" aria-hidden />
          </div>
        </div>
      </section>



      {/* Compact shipping strip */}
      <section className="max-w-5xl mx-auto px-4 -mt-10 md:-mt-14 relative z-10">
        <h2 className="sr-only">Livrare și transport</h2>
        <div className="rounded-2xl bg-card border border-border shadow-warm overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border text-center">
          <div className="px-4 py-4 bg-[color:var(--gold)]/10">
            <Gift className="w-4 h-4 mx-auto mb-1 text-[color:var(--gold)]" />
            <div className="font-display italic text-base md:text-lg leading-snug text-foreground">
              La comanda minimă de <span className="gold-text not-italic font-medium">250 lei</span>
            </div>
            <div className="font-display text-sm md:text-base mt-0.5 text-[color:var(--wood-dark)]/85">transportul este gratuit</div>
            <div className="text-[11px] md:text-xs text-muted-foreground mt-1">Durată livrare: 24–48H</div>
          </div>

          <div className="px-4 py-4">
            <Sparkles className="w-4 h-4 mx-auto mb-1 text-[color:var(--gold)]" />
            <div className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground">Piesa preferată</div>
            <div className="font-display text-base md:text-lg mt-0.5 leading-tight">Lemn ales cu grijă,<br />parfum cald de atelier</div>
            <div className="text-[11px] md:text-xs text-muted-foreground mt-1">Rafinament și o melodie de păstrat</div>
          </div>

          <div className="px-4 py-4">
            <Package className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground">Orice produs făurit</div>
            <div className="font-display text-base md:text-lg mt-0.5 leading-tight">Easybox <span className="gold-text">12,99 lei</span></div>
            <div className="text-[11px] md:text-xs text-muted-foreground">sau curier la domiciliu 25 lei</div>
            <div className="text-[11px] md:text-xs text-[color:var(--wood-dark)]/80 mt-1 italic">Sau programează livrarea!</div>
          </div>

        </div>
      </section>


      <ProductCarouselSection
        title="Descoperă povestea"
        description="Cutiuțe inspirate din filmele și universurile care ne-au marcat copilăria."
        products={byIds(povesteIds)}
        secondaryCta={{ label: "Vezi povestea", to: "/poveste" }}
        bgImage={bgPoveste}
        tone="cream"
      />

      <ProductCarouselSection
        title="Trăiește emoția"
        description="Modele delicate, pentru momente romantice și cadouri din suflet."
        products={byIds(emotieIds)}
        bgImage={bgEmotie}
        tone="cream"
      />

      <ProductCarouselSection
        title="Descoperă alte obiecte unice"
        description="Piese cu personalitate, perfecte pentru colecționari și cadouri memorabile."
        products={byIds(uniceIds)}
        bgImage={bgUnice}
        tone="cream"
      />

      <ReviewsStrip />
      <ConnectSection />
      <FloatingContacts />


    </div>
  );
}
