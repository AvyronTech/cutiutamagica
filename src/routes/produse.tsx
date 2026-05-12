import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { products } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/produse")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Cutiuțe muzicale originale — Cutiuța Magică" },
      { name: "description", content: "Catalog cu fotografii reale pentru cutiuțe muzicale din lemn. 89 lei bucata, 150 lei la 2, 75 lei/buc de la 3." },
    ],
  }),
});

const cats = ["Toate", "Harry Potter", "Stăpânul Inelelor", "Halloween", "Fantasy", "Aventură", "Cadouri Speciale"];

function ProductsPage() {
  const [cat, setCat] = useState("Toate");
  const list = useMemo(() => (cat === "Toate" ? products : products.filter((p) => p.category === cat)), [cat]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-14 text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Catalog</div>
      <h1 className="font-display text-4xl md:text-6xl mt-1">Cutiuțele originale rămase</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">Păstrăm doar produsele cu fotografia reală a cutiuței. 89 lei bucata, 150 lei la 2 bucăți, iar de la 3 bucăți prețul devine 75 lei/buc cu transport gratuit.</p>

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

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 text-left">
        {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </div>
  );
}
