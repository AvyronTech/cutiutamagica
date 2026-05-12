import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Heart, Truck, Gift } from "lucide-react";
import { products } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";
import heroImg from "@/assets/box-lotr.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Cutiuța Magică — Cutiuțe muzicale din lemn handmade" },
      { name: "description", content: "Cutiuțe muzicale gravate cu laser în lemn. Harry Potter, Game of Thrones, Lord of the Rings & melodii romantice. De la 75 lei/buc cu transport gratuit." },
    ],
  }),
});

function Index() {
  const featured = products.slice(0, 4);
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-14 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-10 items-center text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[color:var(--wood)] mb-5 justify-center md:justify-start">
              <Sparkles className="w-3.5 h-3.5" /> Piesă originală · Mecanism durabil
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl leading-[1.05] text-balance">
              Melodii vechi,<br />
              <span className="gold-text">cutiuțe noi.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-lg mx-auto md:mx-0 text-balance">
              Cutiuțe muzicale din lemn, gravate cu poveștile tale preferate.
              Harry Potter, Stăpânul Inelelor, Game of Thrones — o învârtire de manivelă și magia revine.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link to="/produse" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-6 py-3 font-medium hover:opacity-90">
                <Gift className="w-4 h-4" /> Vezi toate cutiuțele
              </Link>
              <Link to="/poveste" className="inline-flex items-center gap-2 border border-border rounded-md px-6 py-3 font-medium hover:bg-muted">
                Povestea noastră
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground justify-center md:justify-start">
              <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Transport gratuit la 3+</div>
              <div className="flex items-center gap-2"><Heart className="w-4 h-4" /> Cadou ambalat</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative order-1 md:order-2 max-w-sm mx-auto md:max-w-none"
          >
            <div className="absolute -inset-6 bg-[color:var(--gold)]/20 rounded-full blur-3xl" />
            <motion.img
              src={heroImg}
              alt="Cutiuța muzicală Stăpânul Inelelor"
              className="relative rounded-2xl shadow-warm w-full"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </section>

      {/* Bundle banner */}
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

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Cele mai îndrăgite</div>
          <h2 className="font-display text-4xl md:text-5xl mt-1">Alege-ți magia</h2>
          <Link to="/produse" className="mt-3 inline-block text-sm underline underline-offset-4 hover:text-foreground/80">Vezi toate →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Story teaser */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="rounded-2xl wood-grain text-[color:var(--cream)] p-10 md:p-16 grid md:grid-cols-2 gap-10 items-center shadow-warm">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">Povestea noastră</div>
            <h2 className="font-display text-4xl md:text-5xl mt-2">Lemn, melodie, amintire.</h2>
            <p className="mt-5 text-[color:var(--cream)]/80 max-w-md">
              Fiecare cutiuță e gândită ca un cadou care se aude. Le gravăm cu laser
              în lemn natural și le împachetăm cu grijă, ca să ajungă magia exact așa cum
              o visezi.
            </p>
            <Link to="/poveste" className="inline-flex mt-6 border border-[color:var(--gold)]/50 rounded-md px-5 py-2.5 text-sm hover:bg-[color:var(--gold)]/10">Citește povestea</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {products.slice(4, 7).map((p) => (
              <img key={p.id} src={p.image} alt={p.name} className="rounded-lg aspect-square object-cover" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
