import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Heart, Truck, Gift, CreditCard } from "lucide-react";
import { products } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Cutiuța Magică — cutiuțe muzicale originale din lemn" },
      { name: "description", content: "Cutiuțe muzicale din lemn cu fotografii reale, descrieri ample și comandă online. 89 lei bucata, 150 lei la 2 și transport gratuit de la 3." },
    ],
  }),
});

function Index() {
  const featured = products.slice(0, 4);
  const hero = products[0];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-14 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-10 items-center text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--wood)] mb-5 justify-center md:justify-start">
              <Sparkles className="w-3.5 h-3.5" /> Piesă originală · Mecanism durabil
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl leading-[1.05] text-balance">Cutiuțe muzicale <span className="gold-text">autentice.</span></h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-lg mx-auto md:mx-0 text-balance">Am păstrat doar modelele cu fotografie reală a cutiuței, clară și ușor de inspectat, ca utilizatorul să ajungă rapid și sigur la comandă.</p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link to="/produse" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-6 py-3 font-medium hover:opacity-90"><Gift className="w-4 h-4" /> Vezi cutiuțele</Link>
              <Link to="/comanda" className="inline-flex items-center gap-2 border border-border rounded-md px-6 py-3 font-medium hover:bg-muted"><CreditCard className="w-4 h-4" /> Comandă online</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground justify-center md:justify-start">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Transport gratuit la 3+</div>
              <div className="flex items-center gap-2"><Heart className="w-4 h-4" /> Fotografii reale</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative order-1 md:order-2 max-w-sm mx-auto md:max-w-none">
            <div className="absolute -inset-6 bg-[color:var(--gold)]/15 rounded-full blur-3xl" />
            <motion.img src={hero.image} alt={hero.name} className="relative rounded-2xl shadow-warm w-full max-h-[520px] object-contain bg-card/70 p-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4">
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          {[
            { qty: "1", price: "89 lei", note: "+ 25 lei transport" },
            { qty: "2", price: "150 lei", note: "75 lei/buc · + 25 lei transport" },
            { qty: "3", price: "225 lei", note: "75 lei/buc · transport gratuit", featured: true },
          ].map((b) => (
            <div key={b.qty} className={`rounded-xl p-6 border ${b.featured ? "wood-grain text-[color:var(--cream)] border-transparent shadow-warm" : "bg-card border-border"}`}>
              <div className="text-xs uppercase tracking-[0.2em] opacity-70">{b.qty} cutiuță{b.qty !== "1" ? "e" : ""}</div>
              <div className={`font-display text-4xl mt-2 ${b.featured ? "gold-text" : ""}`}>{b.price}</div>
              <div className="text-sm mt-1 opacity-80">{b.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Selecție reală</div>
          <h2 className="font-display text-4xl md:text-5xl mt-1">Produsele păstrate</h2>
          <Link to="/produse" className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-foreground/80">Vezi toate →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>
    </div>
  );
}
