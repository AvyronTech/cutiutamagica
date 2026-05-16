import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Heart, Truck, Gift, CreditCard } from "lucide-react";
import { products } from "@/data/products";
import { ProductCarouselSection } from "@/components/site/ProductCarouselSection";

const heroImage = products[0].image;

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Cutiuța Magică — cutiuțe muzicale din lemn" },
      { name: "description", content: "Cutiuțe muzicale din lemn cu fotografii reale, descrieri ample și comandă online. 89 lei bucata, 150 lei la 2 și transport gratuit de la 3." },
      { property: "og:title", content: "Cutiuța Magică — cutiuțe muzicale din lemn" },
      { property: "og:description", content: "Cutiuțe muzicale autentice, gata de dăruit. Comandă online cu transport gratuit de la 3 bucăți." },
      { property: "og:url", content: "https://cutiutamagica.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://cutiutamagica.lovable.app/" },
      { rel: "preload", as: "image", href: heroImage, fetchpriority: "high" },
    ],
  }),
});

function Index() {
  const hero = products[0];

  // Mockup: împărțim produsele existente în 3 subsecțiuni tematice.
  // Vor fi modificate/extinse ulterior (target: 5 per secțiune).
  const povesteIds = ["lotr-rings", "hp-always", "hp-keeper", "pirates", "starwars-dad"];
  const emotieIds = ["fairy", "kitten", "hp-always", "lotr-rings"];
  const uniceIds = ["halloween", "pirates", "starwars-dad", "kitten", "fairy"];

  const byIds = (ids: string[]) => ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is typeof products[number] => Boolean(p));

  const povesteProducts = byIds(povesteIds);
  const emotieProducts = byIds(emotieIds);
  const uniceProducts = byIds(uniceIds);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-14 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-10 items-center text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--wood)] mb-5 justify-center">
              <Sparkles className="w-3.5 h-3.5" /> Piesă originală · Mecanism durabil
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl leading-[1.05] text-balance">Cutiuțe muzicale <span className="gold-text">autentice.</span></h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-lg mx-auto text-balance">Învârți o dată manivela și camera se umple de o melodie care îți aduce înapoi un personaj drag, o scenă din copilărie sau o emoție pe care credeai că ai uitat-o. Fiecare cutiuță este o mică poveste din lemn, gata să fie dăruită.</p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link to="/produse" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-6 py-3 font-medium hover:opacity-90"><Gift className="w-4 h-4" /> Vezi cutiuțele</Link>
              <Link to="/comanda" className="inline-flex items-center gap-2 border border-border rounded-md px-6 py-3 font-medium hover:bg-muted"><CreditCard className="w-4 h-4" /> Comandă online</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground justify-center">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Transport gratuit peste 250 lei</div>
              <div className="flex items-center gap-2"><Heart className="w-4 h-4" /> Fotografii reale</div>
            </div>
          </motion.div>

          <div className="relative order-1 md:order-2 max-w-sm mx-auto md:max-w-none">
            <div className="absolute -inset-6 bg-[color:var(--gold)]/15 rounded-full blur-3xl" />
            <img src={hero.image} alt={hero.name} width={520} height={520} fetchPriority="high" decoding="async" className="relative rounded-2xl shadow-warm w-full max-h-[520px] object-contain bg-card/70 p-4" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4">
        <h2 className="sr-only">Livrare și transport</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          {[
            { label: "Comandă minimă", price: "250 lei", note: "transport gratuit oriunde", featured: true },
            { label: "Curier la domiciliu", price: "25 lei", note: "sub 250 lei comandă" },
            { label: "Easybox Sameday", price: "12,99 lei", note: "sub 250 lei comandă" },
          ].map((b) => (
            <div key={b.label} className={`rounded-xl p-6 border ${b.featured ? "wood-grain text-[color:var(--cream)] border-transparent shadow-warm" : "bg-card border-border"}`}>
              <div className="text-xs uppercase tracking-[0.2em] opacity-70">{b.label}</div>
              <div className={`font-display text-4xl mt-2 ${b.featured ? "gold-text" : ""}`}>{b.price}</div>
              <div className="text-sm mt-1 opacity-80">{b.note}</div>
            </div>
          ))}
        </div>
      </section>

      <ProductCarouselSection
        eyebrow="Subsecțiunea 1"
        title="Descoperă povestea"
        description="Cutiuțe inspirate din filmele și universurile care ne-au marcat copilăria."
        products={povesteProducts}
      />

      <ProductCarouselSection
        eyebrow="Subsecțiunea 2"
        title="Trăiește emoția"
        description="Modele delicate, pentru momente romantice și cadouri din suflet."
        products={emotieProducts}
      />

      <ProductCarouselSection
        eyebrow="Subsecțiunea 3"
        title="Descoperă alte obiecte unice"
        description="Piese cu personalitate, perfecte pentru colecționari și cadouri memorabile."
        products={uniceProducts}
      />
    </div>
  );
}
