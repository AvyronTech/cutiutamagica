import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calcTotals, isAvailable, type Product } from "@/data/products";
import { catalogProducts } from "@/lib/catalog-products";
import type { getStorePricing } from "@/lib/store-pricing.functions";

type CartItem = { id: string; qty: number; addedAt?: number };
type ShopCtx = {
  products: Product[];
  promotion: { unitPrice: number; minQuantity: number } | null;
  cart: CartItem[];
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalQty: number;
  totals: ReturnType<typeof calcTotals>;
  itemsDetailed: (CartItem & { product: Product })[];
};

const Ctx = createContext<ShopCtx | null>(null);

export function ShopProvider({
  children,
  pricing,
}: {
  children: ReactNode;
  pricing: Awaited<ReturnType<typeof getStorePricing>> | null;
}) {
  const products = useMemo(() => catalogProducts(pricing?.catalog ?? []), [pricing?.catalog]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem("cm_cart");
      const parsedCart: unknown = c ? JSON.parse(c) : [];
      if (Array.isArray(parsedCart))
        setCart(
          parsedCart
            .filter(
              (item): item is CartItem =>
                Boolean(item) &&
                typeof item.id === "string" &&
                Number.isInteger(item.qty) &&
                item.qty >= 1 &&
                item.qty <= 5,
            )
            .slice(0, 40)
            .filter(
              (item, index, items) => items.findIndex((other) => other.id === item.id) === index,
            ),
        );
      localStorage.removeItem("cm_fav");
    } catch {
      // Corrupt or unavailable browser storage must not block the storefront.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      if (hydrated) localStorage.setItem("cm_cart", JSON.stringify(cart));
    } catch {
      /* Storage may be disabled by the browser. */
    }
  }, [cart, hydrated]);
  const value = useMemo<ShopCtx>(() => {
    const itemsDetailed = cart
      .map((i) => {
        const product = products.find((p) => p.id === i.id);
        // Un coș salvat înainte ca un model să treacă la „În curând” nu duce la checkout.
        return product && isAvailable(product) ? { ...i, product } : null;
      })
      .filter(Boolean) as (CartItem & { product: Product })[];
    const totalQty = itemsDetailed.reduce((sum, item) => sum + item.qty, 0);
    const baseBani = itemsDetailed.reduce(
      (sum, item) => sum + Math.round((item.product.price ?? 0) * 100) * item.qty,
      0,
    );
    const promotion = pricing?.promotion ?? null;
    const subtotalBani = itemsDetailed.reduce(
      (sum, item) =>
        sum +
        Math.round(
          Math.min(
            item.product.price ?? 0,
            promotion && totalQty >= promotion.minQuantity ? promotion.unitPrice : Infinity,
          ) * 100,
        ) *
          item.qty,
      0,
    );
    const totals = {
      baseSubtotal: baseBani / 100,
      subtotal: subtotalBani / 100,
      total: subtotalBani / 100,
      discount: (baseBani - subtotalBani) / 100,
    };

    return {
      products,
      promotion,
      cart,
      addToCart: (id, qty = 1) =>
        setCart((c) => {
          // Doar produsele puse în vânzare intră în coș; „În curând” sunt respinse.
          const product = products.find((p) => p.id === id);
          if (!Number.isFinite(qty) || !product || !isAvailable(product)) return c;
          const safeQty = Math.max(1, Math.min(5, Math.floor(qty)));
          const now = Date.now();
          const ex = c.find((i) => i.id === id);
          if (ex)
            return c.map((i) =>
              i.id === id ? { ...i, qty: Math.min(5, i.qty + safeQty), addedAt: now } : i,
            );
          return [...c, { id, qty: safeQty, addedAt: now }];
        }),
      setQty: (id, qty) =>
        setCart((c) =>
          !Number.isFinite(qty)
            ? c
            : qty <= 0
              ? c.filter((i) => i.id !== id)
              : c.map((i) =>
                  i.id === id ? { ...i, qty: Math.min(5, Math.max(1, Math.floor(qty))) } : i,
                ),
        ),
      removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
      clearCart: () => setCart([]),
      totalQty,
      totals,
      itemsDetailed,
    };
  }, [cart, products, pricing?.promotion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShop = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("ShopProvider missing");
  return c;
};
