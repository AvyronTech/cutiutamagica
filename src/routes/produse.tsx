import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { products } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/produse")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Cutiuțe muzicale originale — Cutiuța Magică" },
      { name: "description", content: "Catalog cu fotografii reale pentru cutiuțe muzicale din lemn. 89 lei bucata, 150 lei la 2, 75 lei/buc de la 3." },
      { property: "og:title", content: "Catalogul Cutiuța Magică — cutiuțe muzicale din lemn" },
      { property: "og:description", content: "Catalog cu fotografii reale pentru cutiuțele muzicale, gata de dăruit." },
      { property: "og:url", content: "https://cutiutamagica.lovable.app/produse" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.lovable.app/produse" }],
  }),
});

const cats = ["Toate", "Harry Potter", "Stăpânul Inelelor", "Halloween", "Fantasy", "Aventură", "Cadouri Speciale"];

function ProductsPage() {
  const [cat, setCat] = useState("Toate");
  const list = useMemo(() => (cat === "Toate" ? products : products.filter((p) => p.category === cat)), [cat]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 text-center">
      <div className="flex justify-start mb-6">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-full pl-2 pr-4 py-1.5 text-sm font-medium text-[color:var(--wood-dark)] bg-[color:var(--gold)]/15 border border-[color:var(--gold)]/40 shadow-soft hover:bg-[color:var(--gold)]/30 hover:shadow-warm transition-all"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[color:var(--cream)] border border-[color:var(--gold)]/50 group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Înapoi acasă
        </Link>
      </div>

      <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Catalog</div>
      <h1 className="font-display text-4xl md:text-6xl mt-1">Cutiuțele originale rămase</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Alege melodia care spune cel mai bine ceea ce vrei să transmiți. Fiecare cutiuță este gravată în lemn, are mecanism manual durabil și ajunge gata de dăruit, învelită cu grijă.</p>


      <div className="mt-8 flex flex-wrap gap-2 justify-center">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${cat === c ? "wood-grain text-[color:var(--cream)] border-transparent" : "border-border hover:bg-muted"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <h2 className="sr-only">Cutiuțe disponibile</h2>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 text-left">
        {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </div>
  );
}
