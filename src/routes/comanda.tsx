import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutoScroll from "embla-carousel-auto-scroll";
import {
  Check,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { MAX_QTY, unitPriceBani, type Product } from "@/data/products";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { CommercePublicConfig } from "@/lib/commerce-operations-contracts";
import type { WebsiteOrderPublicResult } from "@/lib/order-contracts";
import { useShop } from "@/store/shop";
import { ProductImage } from "@/components/site/ProductImage";

export const Route = createFileRoute("/comanda")({
  component: OrderPage,
  head: () => ({
    meta: [
      { title: "Comandă online — Cutiuța Magică" },
      {
        name: "description",
        content: "Comandă în siguranță cutiuțele muzicale alese, cu livrare în România.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Comandă online — Cutiuța Magică" },
      { property: "og:url", content: "https://cutiutamagica.eu/comanda" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/comanda" }],
  }),
});

type PaymentMethod = "cash_on_delivery" | "card";
type ShippingOption = "home_delivery" | "easybox";
const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  county: "",
  postalCode: "",
  notes: "",
};
const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-3 text-base outline-none transition focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/25 sm:text-sm";

function money(value: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value);
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function OrderPage() {
  const {
    products,
    promotion,
    itemsDetailed,
    addToCart,
    setQty,
    removeFromCart,
    totalQty,
    clearCart,
    totals,
  } = useShop();
  const idempotencyKey = useRef<string | null>(null);
  const [config, setConfig] = useState<CommercePublicConfig | null>(null);
  const [confirmation, setConfirmation] = useState<WebsiteOrderPublicResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [shippingOption, setShippingOption] = useState<ShippingOption>("home_delivery");
  const [consent, setConsent] = useState(false);
  const cartProductIds = useMemo(
    () => new Set(itemsDetailed.map((item) => item.product.id)),
    [itemsDetailed],
  );
  const recommendations = useMemo(
    () => products.filter((product) => !cartProductIds.has(product.id)).slice(0, 8),
    [cartProductIds, products],
  );
  const [configFailed, setConfigFailed] = useState(false);

  const loadConfig = useCallback(() => {
    setConfigFailed(false);
    fetch("/api/v1/commerce/config", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Config indisponibil");
        return (await response.json()) as { data: CommercePublicConfig };
      })
      .then(({ data }) => setConfig(data))
      .catch(() => {
        setConfigFailed(true);
        // id fix: o singură notificare, chiar dacă efectul se reia.
        toast.error("Opțiunile comerciale nu au putut fi încărcate.", { id: "commerce-config" });
      });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (shippingOption === "easybox" && !config?.shipping.easyboxEnabled)
      setShippingOption("home_delivery");
    if (paymentMethod === "card" && !config?.payments.card.enabled)
      setPaymentMethod("cash_on_delivery");
  }, [config, paymentMethod, shippingOption]);

  const shippingCost = useMemo(() => {
    if (!config || config.shipping.requiresConfirmation) return null;
    if (config.shipping.freeOver != null && totals.total >= config.shipping.freeOver) return 0;
    return shippingOption === "easybox"
      ? config.shipping.lockerPrice
      : config.shipping.standardPrice;
  }, [config, shippingOption, totals.total]);

  if (confirmation) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="wood-grain mx-auto flex h-16 w-16 items-center justify-center rounded-full text-[color:var(--gold)]">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="font-display mt-6 text-4xl">Comanda a intrat în poveste</h1>
        <p className="mt-3 text-muted-foreground">
          Comanda <strong>{confirmation.orderNumber}</strong> a fost înregistrată. Vei primi
          actualizările la adresa de e-mail completată.
        </p>
        <div className="mt-5 rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex justify-between">
            <span>Livrare</span>
            <span>
              {confirmation.shippingPending
                ? "Se confirmă separat"
                : money(confirmation.shipping, confirmation.currency)}
            </span>
          </div>
          <div className="mt-2 flex justify-between font-medium">
            <span>Total</span>
            <span>{money(confirmation.total, confirmation.currency)}</span>
          </div>
        </div>
        <Link
          to="/produse"
          className="mt-8 inline-block rounded-md bg-primary px-6 py-3 text-sm text-primary-foreground"
        >
          Continuă cumpărăturile
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return toast.error("Așteaptă încărcarea opțiunilor comerciale.");
    if (!consent) return toast.error("Confirmă termenii comenzii și politica de retur.");
    if (totalQty === 0) return toast.error("Coșul este gol.");
    if (paymentMethod === "card" && config.shipping.requiresConfirmation)
      return toast.error("Plata online devine disponibilă după validarea regulilor de transport.");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          website,
          customer: form,
          paymentMethod,
          shippingOption,
          checkoutConsentAccepted: true,
          checkoutConsentVersion: config.policies.checkoutConsentVersion,
          items: itemsDetailed.map((item) => ({ productId: item.id, quantity: item.qty })),
        }),
      });
      const payload = (await response.json()) as {
        data?: WebsiteOrderPublicResult;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error?.message || "Comanda nu a putut fi înregistrată.");
      const result = payload.data;
      if (paymentMethod === "card") {
        const paymentResponse = await fetch("/api/v1/payments/stripe/checkout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: result.orderId, publicToken: result.publicToken }),
        });
        const paymentPayload = (await paymentResponse.json()) as {
          data?: { checkoutUrl: string };
          error?: { message?: string };
        };
        if (!paymentResponse.ok || !paymentPayload.data?.checkoutUrl)
          throw new Error(
            paymentPayload.error?.message ||
              "Plata online nu a putut fi inițiată. Comanda a rămas salvată.",
          );
        clearCart();
        window.location.assign(paymentPayload.data.checkoutUrl);
        return;
      }
      setConfirmation(result);
      clearCart();
    } catch (error) {
      toast.error("Operația nu a putut fi finalizată.", {
        description: error instanceof Error ? error.message : "Încearcă din nou.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:pt-8 lg:pb-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-10">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-left lg:text-5xl">
            Finalizează comanda
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground lg:text-left">
            {totalQty} {totalQty === 1 ? "cutiuță" : "cutiuțe"} în coș.
          </p>
          {itemsDetailed.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--gold)]/40 bg-card p-8 text-center sm:mt-10 sm:p-10">
              <ShoppingBag className="mx-auto h-10 w-10 text-[color:var(--gold)]" />
              <p className="mt-4 font-display text-xl">Coșul este gol.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Alege o cutiuță și melodia ei revine cu tine acasă.
              </p>
              <Link
                to="/produse"
                className="wood-grain mt-5 inline-flex min-h-12 items-center rounded-full px-6 text-sm font-medium text-[color:var(--cream)] shadow-warm"
              >
                Vezi cutiuțele
              </Link>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {itemsDetailed.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4"
                >
                  <Link to="/produs/$id" params={{ id: item.product.id }} className="shrink-0">
                    <ProductImage
                      src={item.product.image}
                      alt={item.product.name}
                      sizes="88px"
                      className="h-20 w-20 rounded-xl bg-muted/40 object-cover sm:h-24 sm:w-24"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/produs/$id"
                        params={{ id: item.product.id }}
                        className="line-clamp-2 font-display text-base leading-tight hover:underline sm:text-lg"
                      >
                        {item.product.name}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Elimină ${item.product.name}`}
                        onClick={() => removeFromCart(item.id)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.product.melody && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {item.product.melody}
                      </div>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-full border border-border bg-background">
                        <button
                          type="button"
                          aria-label={`Scade cantitatea pentru ${item.product.name}`}
                          onClick={() => setQty(item.id, Math.max(1, item.qty - 1))}
                          className="grid h-10 w-10 place-items-center rounded-l-full hover:bg-muted"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.qty}</span>
                        <button
                          type="button"
                          aria-label={`Crește cantitatea pentru ${item.product.name}`}
                          onClick={() => setQty(item.id, Math.min(MAX_QTY, item.qty + 1))}
                          className="grid h-10 w-10 place-items-center rounded-r-full hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg tabular-nums">
                          {money((unitPriceBani(item.product) * item.qty) / 100)}
                        </div>
                        {item.qty > 1 && (
                          <div className="text-[11px] text-muted-foreground">
                            {money(unitPriceBani(item.product) / 100)} / buc
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {promotion && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/10 p-4 text-left">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--gold)]" />
              <p className="text-sm leading-relaxed">
                {totalQty >= promotion.minQuantity ? (
                  <>
                    <strong>Oferta de cantitate este activă.</strong> Fiecare cutiuță eligibilă
                    ajunge la {money(promotion.unitPrice)}.
                  </>
                ) : (
                  <>
                    Mai adaugă <strong>{promotion.minQuantity - totalQty}</strong>{" "}
                    {promotion.minQuantity - totalQty === 1 ? "cutiuță" : "cutiuțe"} și fiecare
                    produs eligibil ajunge la <strong>{money(promotion.unitPrice)}</strong>.
                  </>
                )}
              </p>
            </div>
          )}

          {recommendations.length > 0 && (
            <CartRecommendations
              products={recommendations}
              onAdd={(product) => {
                addToCart(product.id);
                toast.success("Adăugată în coș", { description: product.name });
              }}
            />
          )}

          <form
            id="checkout-form"
            onSubmit={submit}
            className="mt-8 space-y-7 sm:mt-10 sm:space-y-8"
          >
            <section className="rounded-2xl border border-[color:var(--gold)]/25 bg-card p-4 shadow-soft sm:p-5">
              <h2 className="font-display text-xl sm:text-2xl">
                <span className="mr-2 text-[color:var(--gold)]">✦</span>Date de contact
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  required
                  autoComplete="name"
                  aria-label="Nume complet"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nume complet"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  aria-label="E-mail"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="E-mail"
                  className={inputClass}
                />
                <input
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label="Telefon"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Telefon"
                  className={inputClass}
                />
                <input
                  required
                  autoComplete="address-level1"
                  aria-label="Județ"
                  value={form.county}
                  onChange={(e) => setForm({ ...form, county: e.target.value })}
                  placeholder="Județ"
                  className={inputClass}
                />
                <input
                  required
                  autoComplete="address-level2"
                  aria-label="Localitate"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Localitate"
                  className={inputClass}
                />
                <input
                  required
                  autoComplete="street-address"
                  aria-label="Adresă"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Adresă (stradă, nr, bl, ap)"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  autoComplete="postal-code"
                  aria-label="Cod poștal"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="Cod poștal (opțional)"
                  className={inputClass}
                />
                <textarea
                  aria-label="Mesaj cadou sau observații"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Mesaj cadou sau observații (opțional)"
                  rows={3}
                  className={`${inputClass} sm:col-span-2`}
                />
              </div>
            </section>

            <ChoiceSection title="Livrare">
              <Choice
                selected={shippingOption === "home_delivery"}
                onChange={() => setShippingOption("home_delivery")}
                icon={<PackageCheck className="h-5 w-5" />}
                title="Curier la adresă"
                note={
                  config?.shipping.requiresConfirmation
                    ? "Cost confirmat înainte de procesare"
                    : money(config?.shipping.standardPrice ?? 0)
                }
              />
              <Choice
                disabled={!config?.shipping.easyboxEnabled}
                selected={shippingOption === "easybox"}
                onChange={() => setShippingOption("easybox")}
                icon={<PackageCheck className="h-5 w-5" />}
                title="Easybox"
                note={
                  config?.shipping.easyboxEnabled
                    ? config.shipping.requiresConfirmation
                      ? "Cost confirmat înainte de procesare"
                      : money(config.shipping.lockerPrice ?? 0)
                    : "Disponibil după validarea SmartShip"
                }
              />
            </ChoiceSection>

            <ChoiceSection title="Plată">
              <Choice
                selected={paymentMethod === "cash_on_delivery"}
                onChange={() => setPaymentMethod("cash_on_delivery")}
                icon={<PackageCheck className="h-5 w-5" />}
                title="Ramburs"
                note="Poate necesita confirmare antifraudă"
              />
              <Choice
                disabled={
                  !config?.payments.card.enabled || Boolean(config?.shipping.requiresConfirmation)
                }
                selected={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
                icon={<CreditCard className="h-5 w-5" />}
                title="Card online"
                note={
                  config?.payments.card.enabled
                    ? "Procesare securizată prin Stripe"
                    : "Disponibil după activarea Stripe"
                }
              />
            </ChoiceSection>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
              <input
                required
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--wood-dark)]"
              />
              <span>
                {config?.policies.checkoutConsentText ??
                  "Confirm datele comenzii și accept condițiile comerciale."}{" "}
                <Link to="/retur" className="underline">
                  Politica de retur și garanție
                </Link>{" "}
                și{" "}
                <Link to="/termeni-de-utilizare" className="underline">
                  Termenii de utilizare
                </Link>{" "}
                fac parte din informarea precontractuală. Datele sunt prelucrate conform{" "}
                <Link to="/politica-de-confidentialitate" className="underline">
                  Politicii de confidențialitate
                </Link>
                .
              </span>
            </label>
            <input
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute h-px w-px overflow-hidden opacity-0 pointer-events-none"
            />
            {configFailed && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <p>Nu am putut încărca opțiunile de plată și livrare.</p>
                <button
                  type="button"
                  onClick={loadConfig}
                  className="mt-2 inline-flex min-h-10 items-center rounded-full border border-amber-600/40 px-4 text-sm font-medium"
                >
                  Încearcă din nou
                </button>
              </div>
            )}
            <button
              disabled={submitting || totalQty === 0 || !config}
              type="submit"
              className="wood-grain hidden w-full rounded-xl py-3.5 font-medium text-[color:var(--cream)] shadow-warm disabled:cursor-not-allowed disabled:opacity-50 lg:block"
            >
              {submitting
                ? "Se procesează..."
                : paymentMethod === "card"
                  ? "Continuă către plata securizată"
                  : "Comandă cu obligație de plată"}
            </button>
          </form>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
          <h3 className="font-display text-xl sm:text-2xl">
            <span className="mr-2 text-[color:var(--gold)]">✦</span>Sumar
          </h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Produse ({totalQty} buc)</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Livrare</span>
              <span>
                {shippingCost == null
                  ? "La confirmare"
                  : shippingCost === 0
                    ? "Gratuită"
                    : money(shippingCost)}
              </span>
            </div>
            <div className="font-display flex justify-between border-t border-border pt-3 text-xl">
              <span>Total</span>
              <span>{money(totals.total + (shippingCost ?? 0))}</span>
            </div>
          </div>
          {config?.shipping.requiresConfirmation && (
            <p className="mt-5 rounded-md bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              Regulile de transport nu sunt încă validate. Comanda se salvează fără cost de livrare
              și este confirmată manual; plata online rămâne blocată.
            </p>
          )}
        </aside>
      </div>

      {/* Bara de acțiune pe telefon: totalul rămâne vizibil, comanda se trimite de aici. */}
      {itemsDetailed.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--gold)]/30 bg-[color:var(--cream)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Total
              </div>
              <div className="font-display text-xl leading-tight tabular-nums">
                {money(totals.total + (shippingCost ?? 0))}
              </div>
            </div>
            <button
              form="checkout-form"
              type="submit"
              disabled={submitting || totalQty === 0 || !config}
              className="wood-grain ml-auto min-h-12 flex-1 rounded-full px-5 font-medium text-[color:var(--cream)] shadow-warm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Se procesează..."
                : paymentMethod === "card"
                  ? "Continuă la plată"
                  : "Trimite comanda"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartRecommendations({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (product: Product) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const autoScroll = useMemo(
    () =>
      AutoScroll({
        speed: 0.65,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
      }),
    [],
  );
  const plugins = useMemo(() => (reducedMotion ? [] : [autoScroll]), [autoScroll, reducedMotion]);

  return (
    <section className="mt-9" aria-labelledby="cart-recommendations-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--wood)]">
            Mai încape puțină magie
          </p>
          <h2 id="cart-recommendations-title" className="font-display text-2xl">
            Completează povestea
          </h2>
        </div>
        <Link to="/produse" className="shrink-0 text-xs font-medium text-primary hover:underline">
          Vezi catalogul
        </Link>
      </div>
      <Carousel
        opts={{ align: "start", loop: products.length > 2 }}
        plugins={plugins}
        className="px-2 sm:px-5"
        aria-label="Alte cutiuțe muzicale recomandate"
      >
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem key={product.id} className="basis-[86%] sm:basis-1/2">
              <article className="flex h-full overflow-hidden rounded-xl border border-[color:var(--gold)]/25 bg-card shadow-sm">
                <Link
                  to="/produs/$id"
                  params={{ id: product.id }}
                  className="w-28 shrink-0 bg-[color:var(--gold)]/10 sm:w-32"
                  aria-label={`Vezi ${product.name}`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-full min-h-40 w-full object-contain p-2"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <Link to="/produs/$id" params={{ id: product.id }} className="hover:underline">
                    <h3 className="font-display text-base leading-tight line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2">
                    {product.tagline}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <span className="font-display text-lg">{money(product.price ?? 0)}</span>
                    <button
                      type="button"
                      onClick={() => onAdd(product)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
                      aria-label={`Adaugă ${product.name} în coș`}
                    >
                      <Plus className="h-3.5 w-3.5" /> Adaugă
                    </button>
                  </div>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          aria-label="Recomandarea anterioară"
          className="left-0 hidden border-[color:var(--gold)]/40 bg-card sm:inline-flex"
        />
        <CarouselNext
          aria-label="Recomandarea următoare"
          className="right-0 hidden border-[color:var(--gold)]/40 bg-card sm:inline-flex"
        />
      </Carousel>
    </section>
  );
}

function ChoiceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--gold)]/25 bg-card p-4 shadow-soft sm:p-5">
      <h2 className="font-display text-xl sm:text-2xl">
        <span className="mr-2 text-[color:var(--gold)]">✦</span>
        {title}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Choice({
  disabled,
  selected,
  onChange,
  icon,
  title,
  note,
}: {
  disabled?: boolean;
  selected: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <label
      className={`flex min-h-16 items-center gap-3 rounded-xl border p-4 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"} ${selected ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <input
        type="radio"
        className="h-5 w-5 shrink-0 accent-[color:var(--wood-dark)]"
        disabled={disabled}
        checked={selected}
        onChange={onChange}
      />
      {icon}
      <span>
        <strong className="block text-sm">{title}</strong>
        <span className="text-xs text-muted-foreground">{note}</span>
      </span>
    </label>
  );
}
