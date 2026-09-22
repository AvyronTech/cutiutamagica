import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { MAX_QTY, unitPriceBani } from "@/data/products";
import { ProductImage } from "@/components/site/ProductImage";
import { useShop } from "@/store/shop";
import { playTick, playWood } from "@/lib/sound";

const lei = (bani: number) => `${(bani / 100).toLocaleString("ro-RO")} lei`;

/**
 * Mini-coșul din header: ultimele cutiuțe adăugate, cu cantități și total,
 * plus drumul scurt către pagina de comandă.
 *
 * Pe telefon apare ca panou de jos (mai ușor de atins cu degetul), pe ecrane
 * mari ca panou ancorat sub butonul de coș. Se închide cu Esc, cu clic în
 * afară sau după ce pleci către altă pagină.
 *
 * Se randează în `document.body`: header-ul are `will-change: transform`, iar
 * un element `fixed` dinăuntrul lui s-ar raporta la header, nu la ecran.
 */
export function MiniCart({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { itemsDetailed, setQty, removeFromCart, totalQty, totals } = useShop();

  // Ultimele adăugate primele; intrările vechi (fără marcaj de timp) rămân la coadă.
  const items = useMemo(
    () => [...itemsDetailed].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)),
    [itemsDetailed],
  );

  useEffect(() => {
    if (!open) return;
    playWood();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[oklch(0.18_0.03_40/0.45)] backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-0"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Coșul tău"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-3xl border-t border-[color:var(--gold)]/35 bg-[color:var(--cream)] shadow-[0_-24px_60px_-24px_rgba(60,35,10,0.55)] sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[84px] sm:w-[400px] sm:rounded-2xl sm:border sm:shadow-[0_28px_60px_-28px_rgba(60,35,10,0.65)]"
          >
            {/* mânerul panoului, doar pe telefon */}
            <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-[color:var(--wood-dark)]/20" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <h2 className="font-display text-xl">
                Coșul tău
                {totalQty > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {totalQty} {totalQty === 1 ? "cutiuță" : "cutiuțe"}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Închide coșul"
                className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--gold)]/30 text-[color:var(--wood-dark)] transition hover:bg-[color:var(--gold)]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="px-5 pb-8 pt-2 text-center">
                <ShoppingBag className="mx-auto h-9 w-9 text-[color:var(--wood-dark)]/35" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Încă nu ai nicio cutiuță în coș.
                </p>
                <Link
                  to="/produse"
                  onClick={onClose}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--wood-dark)] px-6 text-sm font-medium text-[color:var(--cream)]"
                >
                  Vezi cutiuțele
                </Link>
              </div>
            ) : (
              <>
                <ul className="max-h-[46vh] space-y-2 overflow-y-auto overscroll-contain px-3 pb-2 sm:max-h-[320px]">
                  {items.map((item) => {
                    const linePrice = unitPriceBani(item.product) * item.qty;
                    return (
                      <li
                        key={item.id}
                        className="flex gap-3 rounded-xl border border-[color:var(--gold)]/20 bg-white/60 p-2"
                      >
                        <Link
                          to="/produs/$id"
                          params={{ id: item.product.id }}
                          onClick={onClose}
                          className="shrink-0"
                        >
                          <ProductImage
                            src={item.product.image}
                            alt={item.product.name}
                            sizes="64px"
                            className="h-16 w-16 rounded-lg bg-[color:var(--cream)] object-cover"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/produs/$id"
                            params={{ id: item.product.id }}
                            onClick={onClose}
                            className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                          >
                            {item.product.name}
                          </Link>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--cream)]">
                              <button
                                type="button"
                                aria-label={`Scade cantitatea pentru ${item.product.name}`}
                                onClick={() => {
                                  playTick();
                                  setQty(item.id, item.qty - 1);
                                }}
                                className="grid h-9 w-9 place-items-center rounded-l-full hover:bg-[color:var(--gold)]/15"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm tabular-nums">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                aria-label={`Crește cantitatea pentru ${item.product.name}`}
                                onClick={() => {
                                  playTick();
                                  setQty(item.id, Math.min(MAX_QTY, item.qty + 1));
                                }}
                                className="grid h-9 w-9 place-items-center rounded-r-full hover:bg-[color:var(--gold)]/15"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="font-display text-base tabular-nums">
                              {lei(linePrice)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Elimină ${item.product.name}`}
                          onClick={() => removeFromCart(item.id)}
                          className="grid h-10 w-10 shrink-0 place-items-center self-start rounded-full text-muted-foreground transition hover:bg-[oklch(0.62_0.2_25)]/10 hover:text-[oklch(0.55_0.2_25)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-[color:var(--gold)]/25 bg-[color:var(--cream)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Total produse</span>
                    <span className="font-display text-2xl tabular-nums">
                      {totals.total.toLocaleString("ro-RO")} lei
                    </span>
                  </div>
                  <Link
                    to="/comanda"
                    onClick={onClose}
                    className="wood-grain mt-3 flex min-h-12 items-center justify-center rounded-full text-[color:var(--cream)] shadow-warm transition hover:opacity-95"
                  >
                    Vezi coșul și finalizează
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 w-full py-2 text-center text-sm text-muted-foreground hover:text-[color:var(--wood-dark)]"
                  >
                    Continuă cumpărăturile
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
