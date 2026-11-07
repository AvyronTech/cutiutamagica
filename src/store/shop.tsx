import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { isAvailable, type Product } from "@/data/products";
import { catalogProducts } from "@/lib/catalog-products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { calculateProductDiscountTotals } from "@/lib/product-price";
import { trackGrowthEvent } from "@/lib/growth-events";
import {
  CART_RECOVERY_STORAGE_KEY,
  GIFT_LIST_STORAGE_KEY,
  cartRecoveryStage,
  parseCartRecoveryState,
  sanitizeGiftList,
  type CartRecoveryStage,
  type CartRecoveryState,
} from "@/lib/cart-recovery";

type CartItem = { id: string; qty: number; addedAt?: number };
type ShopCtx = {
  products: Product[];
  promotion: { unitPrice: number; minQuantity: number } | null;
  cart: CartItem[];
  hydrated: boolean;
  addToCart: (id: string, qty?: number) => number;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  giftList: string[];
  giftListDetailed: Product[];
  saveForGiftList: (id: string) => void;
  moveGiftToCart: (id: string) => boolean;
  removeFromGiftList: (id: string) => void;
  recoveryStage: CartRecoveryStage;
  dismissCartRecovery: (stage: Exclude<CartRecoveryStage, null>) => void;
  totalQty: number;
  totals: {
    referenceSubtotal: number;
    baseSubtotal: number;
    subtotal: number;
    total: number;
    productDiscount: number;
    volumeDiscount: number;
    /** Alias păstrat pentru componentele care afișează oferta de cantitate. */
    discount: number;
  };
  itemsDetailed: (CartItem & { product: Product })[];
};

const Ctx = createContext<ShopCtx | null>(null);

export function ShopProvider({
  children,
  pricing: initialPricing,
}: {
  children: ReactNode;
  pricing: Awaited<ReturnType<typeof getStorePricing>> | null;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: pricing } = useQuery({
    queryKey: ["storefront-pricing"],
    queryFn: () => getStorePricing(),
    initialData: initialPricing ?? undefined,
    enabled: !path.startsWith("/admin") && path !== "/auth",
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const products = useMemo(() => catalogProducts(pricing?.catalog ?? []), [pricing?.catalog]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const updateCart = useCallback((next: CartItem[] | ((current: CartItem[]) => CartItem[])) => {
    const value = typeof next === "function" ? next(cartRef.current) : next;
    cartRef.current = value;
    setCart(value);
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const [giftList, setGiftList] = useState<string[]>([]);
  const [recovery, setRecovery] = useState<CartRecoveryState | null>(null);

  const recordCartInteraction = useCallback(() => {
    setRecovery({ lastInteractionAt: Date.now() });
  }, []);

  useEffect(() => {
    try {
      const c = localStorage.getItem("cm_cart");
      const parsedCart: unknown = c ? JSON.parse(c) : [];
      if (Array.isArray(parsedCart)) {
        const restoredCart = parsedCart
          .filter(
            (item): item is CartItem =>
              Boolean(item) &&
              typeof item.id === "string" &&
              Number.isInteger(item.qty) &&
              item.qty >= 1 &&
              item.qty <= 5,
          )
          .map((item) => ({
            id: item.id,
            qty: item.qty,
            addedAt:
              typeof item.addedAt === "number" && Number.isFinite(item.addedAt)
                ? item.addedAt
                : undefined,
          }))
          .slice(0, 40)
          .filter(
            (item, index, items) => items.findIndex((other) => other.id === item.id) === index,
          );
        updateCart(restoredCart);
        const savedRecovery = parseCartRecoveryState(
          localStorage.getItem(CART_RECOVERY_STORAGE_KEY),
        );
        const lastProductInteraction = restoredCart.reduce(
          (latest, item) => Math.max(latest, item.addedAt ?? 0),
          0,
        );
        setRecovery(
          savedRecovery ?? {
            lastInteractionAt: lastProductInteraction || Date.now(),
          },
        );
      }
      setGiftList(sanitizeGiftList(localStorage.getItem(GIFT_LIST_STORAGE_KEY)));
      localStorage.removeItem("cm_fav");
    } catch {
      // Corrupt or unavailable browser storage must not block the storefront.
    }
    setHydrated(true);
  }, [updateCart]);

  useEffect(() => {
    try {
      if (hydrated) localStorage.setItem("cm_cart", JSON.stringify(cart));
    } catch {
      /* Storage may be disabled by the browser. */
    }
  }, [cart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(GIFT_LIST_STORAGE_KEY, JSON.stringify(giftList));
      if (recovery) localStorage.setItem(CART_RECOVERY_STORAGE_KEY, JSON.stringify(recovery));
      else localStorage.removeItem(CART_RECOVERY_STORAGE_KEY);
    } catch {
      /* Storage may be disabled by the browser. */
    }
  }, [giftList, hydrated, recovery]);

  const value = useMemo<ShopCtx>(() => {
    const itemsDetailed = cart
      .map((i) => {
        const product = products.find((p) => p.id === i.id);
        // Un coș salvat înainte ca un model să treacă la „În curând” nu duce la checkout.
        return product && isAvailable(product) ? { ...i, product } : null;
      })
      .filter(Boolean) as (CartItem & { product: Product })[];
    const totalQty = itemsDetailed.reduce((sum, item) => sum + item.qty, 0);
    const catalogTotals = calculateProductDiscountTotals(
      itemsDetailed.map((item) => ({ product: item.product, quantity: item.qty })),
    );
    const baseBani = catalogTotals.currentSubtotalBani;
    const referenceBani = catalogTotals.referenceSubtotalBani;
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
      referenceSubtotal: referenceBani / 100,
      baseSubtotal: baseBani / 100,
      subtotal: subtotalBani / 100,
      total: subtotalBani / 100,
      productDiscount: (referenceBani - baseBani) / 100,
      volumeDiscount: (baseBani - subtotalBani) / 100,
      discount: (baseBani - subtotalBani) / 100,
    };
    const giftListDetailed = giftList
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product));

    return {
      products,
      promotion,
      cart,
      hydrated,
      addToCart: (id, qty = 1) => {
        const product = products.find((p) => p.id === id);
        if (!Number.isFinite(qty) || qty < 1 || !product || !isAvailable(product)) return 0;
        const existing = cartRef.current.find((i) => i.id === id);
        const added = Math.min(5 - (existing?.qty ?? 0), Math.floor(qty));
        if (added <= 0) return 0;
        updateCart((c) =>
          existing
            ? c.map((i) => (i.id === id ? { ...i, qty: i.qty + added, addedAt: Date.now() } : i))
            : [...c, { id, qty: added, addedAt: Date.now() }],
        );
        setGiftList((current) => current.filter((giftId) => giftId !== id));
        recordCartInteraction();
        trackGrowthEvent("add_to_cart", {
          productSlug: product.id,
          value: (product.price ?? 0) * added,
          quantity: added,
          properties: { source: path },
        });
        return added;
      },
      setQty: (id, qty) => {
        updateCart((c) =>
          !Number.isFinite(qty)
            ? c
            : qty <= 0
              ? c.filter((i) => i.id !== id)
              : c.map((i) =>
                  i.id === id
                    ? {
                        ...i,
                        qty: Math.min(5, Math.max(1, Math.floor(qty))),
                        addedAt: Date.now(),
                      }
                    : i,
                ),
        );
        recordCartInteraction();
      },
      removeFromCart: (id) => {
        updateCart((c) => c.filter((i) => i.id !== id));
        recordCartInteraction();
      },
      clearCart: () => {
        updateCart([]);
        recordCartInteraction();
      },
      giftList,
      giftListDetailed,
      saveForGiftList: (id) => {
        if (!products.some((product) => product.id === id)) return;
        setGiftList((current) => (current.includes(id) ? current : [...current, id]));
        updateCart((current) => current.filter((item) => item.id !== id));
        recordCartInteraction();
      },
      moveGiftToCart: (id) => {
        const product = products.find((candidate) => candidate.id === id);
        if (!product || !isAvailable(product)) return false;
        const existing = cartRef.current.find((item) => item.id === id);
        updateCart((current) =>
          existing
            ? current.map((item) =>
                item.id === id
                  ? { ...item, qty: Math.min(5, item.qty + 1), addedAt: Date.now() }
                  : item,
              )
            : [...current, { id, qty: 1, addedAt: Date.now() }],
        );
        setGiftList((current) => current.filter((giftId) => giftId !== id));
        recordCartInteraction();
        return true;
      },
      removeFromGiftList: (id) =>
        setGiftList((current) => current.filter((giftId) => giftId !== id)),
      recoveryStage:
        hydrated && itemsDetailed.length > 0 ? cartRecoveryStage(recovery, Date.now()) : null,
      dismissCartRecovery: (stage) =>
        setRecovery((current) =>
          current
            ? {
                ...current,
                ...(stage === "story"
                  ? { storyDismissedAt: Date.now() }
                  : { giftDismissedAt: Date.now() }),
              }
            : current,
        ),
      totalQty,
      totals,
      itemsDetailed,
    };
  }, [
    cart,
    giftList,
    hydrated,
    products,
    pricing?.promotion,
    path,
    recordCartInteraction,
    recovery,
    updateCart,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShop = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("ShopProvider missing");
  return c;
};
