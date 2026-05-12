import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { products } from "@/data/products";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/produse")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Toate cutiuțele muzicale — Cutiuța Magică" },
      { name: "description", content: "Catalog complet de cutiuțe muzicale handmade: Harry Potter, Game of Thrones, Lord of the Rings, romantice. 89 lei/buc." },
    ],
  }),
});

const cats = ["Toate", "Harry Potter", "Game of Thrones", "Stăpânul Inelelor", "Halloween", "Fantasy", "Aventură", "Romantic", "Cadouri Speciale"];

function ProductsPage() {
  const [cat, setCat] = useState("Toate");
  const list = useMemo(() => (cat === "Toate" ? products : products.filter((p) => p.category === cat)), [cat]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-14">
      <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Catalog</div>
      <h1 className="font-display text-5xl md:text-6xl mt-1">Cutiuțele noastre</h1>
      <p className="mt-3 text-muted-foreground max-w-xl">Alege povestea ta. Toate la 89 lei — sau 75 lei/buc dacă iei două sau mai multe.</p>

      <div className="mt-8 flex flex-wrap gap-2">
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

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </div>
  );
}
