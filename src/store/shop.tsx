import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calcTotals, products, type Product } from "@/data/products";

type CartItem = { id: string; qty: number };
type ShopCtx = {
  cart: CartItem[];
  favorites: string[];
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  totalQty: number;
  totals: ReturnType<typeof calcTotals>;
  itemsDetailed: (CartItem & { product: Product })[];
};

const Ctx = createContext<ShopCtx | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem("cm_cart");
      const f = localStorage.getItem("cm_fav");
      if (c) setCart(JSON.parse(c));
      if (f) setFavorites(JSON.parse(f));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("cm_cart", JSON.stringify(cart));
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem("cm_fav", JSON.stringify(favorites));
  }, [favorites, hydrated]);

  const value = useMemo<ShopCtx>(() => {
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    const totals = calcTotals(totalQty);
    const itemsDetailed = cart
      .map((i) => {
        const product = products.find((p) => p.id === i.id);
        return product ? { ...i, product } : null;
      })
      .filter(Boolean) as (CartItem & { product: Product })[];

    return {
      cart,
      favorites,
      addToCart: (id, qty = 1) =>
        setCart((c) => {
          const safeQty = Math.max(1, Math.min(5, qty));
          const ex = c.find((i) => i.id === id);
          if (ex) return c.map((i) => (i.id === id ? { ...i, qty: Math.min(5, i.qty + safeQty) } : i));
          return [...c, { id, qty: safeQty }];
        }),
      setQty: (id, qty) =>
        setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty: Math.min(5, Math.max(1, qty)) } : i)))),
      removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
      clearCart: () => setCart([]),
      toggleFavorite: (id) =>
        setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      isFavorite: (id) => favorites.includes(id),
      totalQty,
      totals,
      itemsDetailed,
    };
  }, [cart, favorites]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShop = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("ShopProvider missing");
  return c;
};
