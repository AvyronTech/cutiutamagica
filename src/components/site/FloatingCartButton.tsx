import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, ArrowUpRight } from "lucide-react";
import { useShop } from "@/store/shop";
import {
  oppositeSide,
  showFloatingCart,
  useChatPlacement,
  type WidgetSide,
} from "@/lib/floating-widgets";

export function FloatingCartButton({
  pathname,
  open,
  onOpen,
}: {
  pathname: string;
  open: boolean;
  onOpen: (trigger: HTMLButtonElement, side: WidgetSide) => void;
}) {
  const { totalQty, totals } = useShop();
  const chat = useChatPlacement();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !showFloatingCart(pathname, totalQty)) return null;
  const side = oppositeSide(chat.side);
  return createPortal(
    <button
      type="button"
      hidden={open || chat.open}
      className="floating-cart-button"
      data-side={side}
      data-cart-target="floating"
      aria-label={`Deschide coșul: ${totalQty} ${totalQty === 1 ? "cutiuță" : "cutiuțe"}, ${totals.total.toLocaleString("ro-RO")} lei`}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event) => onOpen(event.currentTarget, side)}
    >
      <span className="floating-cart-icon">
        <ShoppingBag size={21} aria-hidden="true" />
        <span>{totalQty}</span>
      </span>
      <span>
        <strong>Coșul tău</strong>
        <small>{totals.total.toLocaleString("ro-RO")} lei</small>
      </span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </button>,
    document.body,
  );
}
