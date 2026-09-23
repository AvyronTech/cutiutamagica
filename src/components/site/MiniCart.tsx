import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { MAX_QTY, unitPriceBani } from "@/data/products";
import { ProductImage } from "@/components/site/ProductImage";
import { useShop } from "@/store/shop";
import { playTick, playWood } from "@/lib/sound";

const lei = (bani: number) => `${(bani / 100).toLocaleString("ro-RO")} lei`;

/** One accessible cart panel shared by header and floating access. */
export function MiniCart({
  open,
  onClose,
  side = "right",
  onRestoreFocus,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  onRestoreFocus: () => void;
}) {
  const { itemsDetailed, setQty, removeFromCart, totalQty, totals } = useShop();

  // Ultimele adăugate primele; intrările vechi (fără marcaj de timp) rămân la coadă.
  const items = useMemo(
    () => [...itemsDetailed].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)),
    [itemsDetailed],
  );

  useEffect(() => {
    if (open) playWood();
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="cart-panel-overlay" />
        <Dialog.Content
          className="cart-panel"
          data-side={side}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus();
          }}
        >
          {/* mânerul panoului, doar pe telefon */}
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-[color:var(--wood-dark)]/20" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <Dialog.Title className="font-display text-xl">
              Coșul tău
              {totalQty > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {totalQty} {totalQty === 1 ? "cutiuță" : "cutiuțe"}
                </span>
              )}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              aria-label="Închide coșul"
              className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--gold)]/30 text-[color:var(--wood-dark)] transition hover:bg-[color:var(--gold)]/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Dialog.Description className="sr-only">
            Verifică produsele și cantitățile înainte de finalizarea comenzii.
          </Dialog.Description>
          {items.length === 0 ? (
            <div className="px-5 pb-8 pt-2 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-[color:var(--wood-dark)]/35" />
              <p className="mt-3 text-sm text-muted-foreground">Încă nu ai nicio cutiuță în coș.</p>
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
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--cream)]">
                            <button
                              type="button"
                              aria-label={`Scade cantitatea pentru ${item.product.name}`}
                              onClick={() => {
                                playTick();
                                setQty(item.id, item.qty - 1);
                              }}
                              className="grid h-11 w-11 place-items-center rounded-l-full hover:bg-[color:var(--gold)]/15"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm tabular-nums">{item.qty}</span>
                            <button
                              type="button"
                              disabled={item.qty >= MAX_QTY}
                              aria-label={`Crește cantitatea pentru ${item.product.name}`}
                              onClick={() => {
                                playTick();
                                setQty(item.id, Math.min(MAX_QTY, item.qty + 1));
                              }}
                              className="grid h-11 w-11 place-items-center rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[color:var(--gold)]/15"
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
                        className="grid h-11 w-11 shrink-0 place-items-center self-start rounded-full text-muted-foreground transition hover:bg-[oklch(0.62_0.2_25)]/10 hover:text-[oklch(0.55_0.2_25)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-[color:var(--gold)]/25 bg-[color:var(--cream)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {totals.discount > 0 && (
                  <div className="mb-2 flex items-center justify-between text-sm text-emerald-800">
                    <span>Reducerea ta</span>
                    <span>−{totals.discount.toLocaleString("ro-RO")} lei</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total produse</span>
                  <span className="font-display text-2xl tabular-nums">
                    {totals.total.toLocaleString("ro-RO")} lei
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Livrarea se calculează la finalizarea comenzii.
                </p>
                <Link
                  to="/comanda"
                  onClick={onClose}
                  className="wood-grain mt-3 flex min-h-12 items-center justify-center rounded-full text-[color:var(--cream)] shadow-warm transition hover:opacity-95"
                >
                  Finalizează comanda
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
