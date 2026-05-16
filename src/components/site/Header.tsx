import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import { useShop } from "@/store/shop";

export function Header() {
  const { totalQty, favorites } = useShop();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-md wood-grain flex items-center justify-center shadow-soft">
            <Sparkles className="w-4 h-4 text-[color:var(--gold)]" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-tight">Cutiuța <span className="gold-text">Magică</span></div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">piesă originală · mecanism durabil</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <Link to="/" className="hover:text-foreground/80 [&.active]:text-foreground [&.active]:font-medium" activeOptions={{ exact: true }}>Acasă</Link>
          <Link to="/produse" className="hover:text-foreground/80 [&.active]:font-medium">Produse</Link>
          <Link to="/poveste" className="hover:text-foreground/80 [&.active]:font-medium">Poveste</Link>
          <Link to="/comanda" className="hover:text-foreground/80 [&.active]:font-medium">Comandă</Link>
        </nav>
        <div className="flex items-center gap-1">
          <Link to="/favorite" aria-label="Favorite" className="relative p-2 rounded-md hover:bg-muted">
            <Heart className="w-5 h-5" />
            {favorites.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[color:var(--gold)] text-[color:var(--wood-dark)] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{favorites.length}</span>
            )}
          </Link>
          <Link to="/comanda" aria-label="Coș de cumpărături" className="relative p-2 rounded-md hover:bg-muted">
            <ShoppingBag className="w-5 h-5" />
            {totalQty > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[color:var(--wood-dark)] text-[color:var(--cream)] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{totalQty}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
