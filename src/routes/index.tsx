import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Truck, Package, CreditCard, BookOpen, ShoppingBag, Gift } from "lucide-react";
import { products } from "@/data/products";
import { ProductCarouselSection } from "@/components/site/ProductCarouselSection";
import { ConnectSection } from "@/components/site/ConnectSection";
import { ReviewsStrip } from "@/components/site/ReviewsStrip";
import { FloatingContacts } from "@/components/site/FloatingContacts";


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

const quickLinks = [
  { to: "/produse", label: "Vezi cutiuțele", Icon: Gift },
  { to: "/poveste", label: "Povestea noastră", Icon: BookOpen },
  { to: "/comanda", label: "Comandă rapid", Icon: ShoppingBag },
];

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
      {/* HERO with background image */}
      <section className="relative overflow-hidden">
        <div className="relative h-[78vh] min-h-[520px] max-h-[760px] w-full">
          <img
            src={hero.image}
            alt={hero.name}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--wood-dark)]/85 via-[color:var(--wood-dark)]/55 to-[color:var(--wood-dark)]/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]" />

          <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center text-[color:var(--cream)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="relative inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[color:var(--gold)] mb-4 rounded-full px-4 py-1.5 overflow-hidden border border-[color:var(--gold)]/30 bg-[color:var(--cream)]/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_8px_24px_-12px_rgba(0,0,0,0.5)]">
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
                <span aria-hidden className="pointer-events-none absolute -inset-x-6 -top-6 h-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] blur-md" />
                <Sparkles className="w-3.5 h-3.5 relative" />
                <span className="relative">Piesă originală · Mecanism durabil</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-7xl leading-[1.05] text-balance max-w-3xl">
                Cutiuțe muzicale <span className="gold-text">autentice.</span>
              </h1>
              <p className="mt-5 text-base md:text-lg text-[color:var(--cream)]/85 max-w-xl mx-auto text-balance">
                O învârtire de manivelă și camera se umple de o melodie care aduce înapoi o emoție dragă. Mici povești din lemn, gata să fie dăruite.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {quickLinks.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium bg-[color:var(--cream)]/10 backdrop-blur-md border border-[color:var(--cream)]/25 hover:bg-[color:var(--cream)]/20 transition"
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Compact shipping strip */}
      <section className="max-w-5xl mx-auto px-4 -mt-10 md:-mt-14 relative z-10">
        <h2 className="sr-only">Livrare și transport</h2>
        <div className="rounded-2xl bg-card border border-border shadow-warm overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border text-center">
          <div className="px-4 py-5 bg-[color:var(--gold)]/10">
            <Gift className="w-4 h-4 mx-auto mb-1 text-[color:var(--gold)]" />
            <div className="text-[11px] md:text-xs leading-snug text-muted-foreground">
              La comanda minimă de <span className="font-medium text-foreground">250 lei</span>
            </div>
            <div className="font-display text-xl md:text-2xl mt-1 gold-text">transportul este gratuit</div>
          </div>

          <div className="px-4 py-5">
            <Sparkles className="w-4 h-4 mx-auto mb-1 text-[color:var(--gold)]" />
            <div className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground">Piesa preferată</div>
            <div className="font-display text-base md:text-lg mt-1 leading-tight">Lemn ales cu grijă,<br />parfum cald de atelier</div>
            <div className="text-[11px] md:text-xs text-muted-foreground mt-1">Rafinament și o melodie de păstrat</div>
          </div>

          <div className="px-4 py-5">
            <Package className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground">Orice produs făurit</div>
            <div className="font-display text-base md:text-lg mt-1 leading-tight">Easybox <span className="gold-text">12,99 lei</span></div>
            <div className="text-[11px] md:text-xs text-muted-foreground">sau curier la domiciliu 25 lei</div>
          </div>
        </div>
      </section>


      <ProductCarouselSection
        title="Descoperă povestea"
        description="Cutiuțe inspirate din filmele și universurile care ne-au marcat copilăria."
        products={byIds(povesteIds)}
        secondaryCta={{ label: "Vezi povestea", to: "/poveste" }}
      />

      <ProductCarouselSection
        title="Trăiește emoția"
        description="Modele delicate, pentru momente romantice și cadouri din suflet."
        products={byIds(emotieIds)}
      />

      <ProductCarouselSection
        title="Descoperă alte obiecte unice"
        description="Piese cu personalitate, perfecte pentru colecționari și cadouri memorabile."
        products={byIds(uniceIds)}
      />

      <ReviewsStrip />
      <ConnectSection />
      <FloatingContacts />

    </div>
  );
}
