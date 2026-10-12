import { Music2, ShoppingBag } from "lucide-react";
import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@/data/products";

export function ProductMobileBuyBar({
  product,
  audioAvailable,
  onAdd,
}: {
  product: Product;
  audioAvailable: boolean;
  onAdd: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > 560);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!mounted) return null;
  return createPortal(
    <aside
      className="product-mobile-buy-bar"
      data-visible={visible || undefined}
      data-audio={audioAvailable || undefined}
      aria-label="Cumpără rapid"
      style={{ "--world-accent": "#d9ae68" } as CSSProperties}
    >
      <div>
        <strong>{Number(product.price ?? 0).toLocaleString("ro-RO")} lei</strong>
        <span>În stoc · Preț final</span>
      </div>
      {audioAvailable && (
        <button
          type="button"
          className="product-mobile-buy-bar__audio"
          onClick={() => window.dispatchEvent(new CustomEvent("cm:primary-audio-request"))}
          aria-label="Ascultă cutiuța"
        >
          <Music2 />
        </button>
      )}
      <button type="button" className="product-mobile-buy-bar__add" onClick={onAdd}>
        <ShoppingBag /> Adaugă în coș
      </button>
    </aside>,
    document.body,
  );
}
