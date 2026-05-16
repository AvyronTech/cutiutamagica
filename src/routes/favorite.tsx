import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { products } from "@/data/products";
import { useShop } from "@/store/shop";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/favorite")({
  component: FavPage,
  head: () => ({
    meta: [
      { title: "Favorite — Cutiuța Magică" },
      { name: "description", content: "Cutiuțele tale preferate, salvate pentru mai târziu." },
      { property: "og:title", content: "Favorite — Cutiuța Magică" },
      { property: "og:description", content: "Cutiuțele tale preferate, salvate pentru mai târziu." },
      { property: "og:url", content: "https://cutiutamagica.lovable.app/favorite" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.lovable.app/favorite" }],
  }),
});

function FavPage() {
  const { favorites } = useShop();
  const list = products.filter((p) => favorites.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-14">
      <div className="flex items-center gap-3">
        <Heart className="w-6 h-6 text-[color:var(--gold)] fill-current" />
        <h1 className="font-display text-5xl">Favoritele tale</h1>
      </div>
      <p className="mt-2 text-muted-foreground">{list.length} cutiuț{list.length === 1 ? "ă" : "e"} salvat{list.length === 1 ? "ă" : "e"}.</p>

      {list.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">Nu ai încă favorite. Apasă pe <Heart className="inline w-4 h-4" /> la oricare cutiuță.</p>
          <Link to="/produse" className="mt-6 inline-block bg-primary text-primary-foreground rounded-md px-6 py-3 text-sm font-medium">Descoperă cutiuțele</Link>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Cutiuțe favorite</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
