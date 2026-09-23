import type { PaymentProvider } from "@/lib/checkout-settings";
import { CheckoutDelivery, type DeliveryOffer } from "@/components/site/CheckoutDelivery";
import { PaymentRecovery } from "@/components/site/PaymentRecovery";
import { pendingPaymentKey, openSecureCheckout, type PendingPayment } from "@/lib/checkout-client";
import { notifyAddedToCart } from "@/lib/notify";
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
import { isAvailable, MAX_QTY, unitPriceBani, type Product } from "@/data/products";
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
  const submissionBody = useRef<string | null>(null);
  const [config, setConfig] = useState<CommercePublicConfig | null>(null);
  const [confirmation, setConfirmation] = useState<WebsiteOrderPublicResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [shippingOption, setShippingOption] = useState<ShippingOption>("home_delivery");
  const [consent, setConsent] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("stripe");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [submissionLocked, setSubmissionLocked] = useState(false);
  const [quote, setQuote] = useState<{ offer: DeliveryOffer; context: string } | null>(null);
  const deliveryRequest = {
    customer: form,
    items: itemsDetailed.map((i) => ({ productId: i.id, quantity: i.qty })),
    paymentMethod,
    shippingOption,
  };
  const deliveryContext = JSON.stringify({ ...deliveryRequest, total: totals.total });
  const activeQuote =
    quote?.context === deliveryContext && Date.parse(quote.offer.expiresAt) > Date.now()
      ? quote.offer
      : null;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(pendingPaymentKey);
      if (raw) {
        const saved = JSON.parse(raw) as PendingPayment;
        if (
          saved.order?.orderId &&
          saved.order?.publicToken &&
          saved.items?.every(
            (i) => typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0,
          )
        )
          setPendingPayment(saved);
      }
    } catch {
      /* Checkout remains available when storage is disabled. */
    }
    setRecovering(false);
  }, []);
  useEffect(() => {
    if (!quote) return;
    const timeout = setTimeout(
      () => setQuote(null),
      Math.max(0, Date.parse(quote.offer.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [quote]);
  const cartProductIds = useMemo(
    () => new Set(itemsDetailed.map((item) => item.product.id)),
    [itemsDetailed],
  );
  const recommendations = useMemo(
    () =>
      products
        .filter((product) => isAvailable(product) && !cartProductIds.has(product.id))
        .slice(0, 8),
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
    if (paymentMethod === "card" && !config?.payments.options.length)
      setPaymentMethod("cash_on_delivery");
    if (
      config?.payments.options.length &&
      !config.payments.options.some((o) => o.id === paymentProvider)
    )
      setPaymentProvider(config.payments.options[0].id);
  }, [config, paymentMethod, shippingOption, paymentProvider]);

  const shippingCost = useMemo(() => {
    if (activeQuote) return activeQuote.price;
    if (!config || config.shipping.requiresConfirmation) return null;
    if (config.shipping.freeOver != null && totals.total >= config.shipping.freeOver) return 0;
    return shippingOption === "easybox"
      ? config.shipping.lockerPrice
      : config.shipping.standardPrice;
  }, [config, shippingOption, totals.total, activeQuote]);

  if (recovering)
    return (
      <div role="status" className="mx-auto max-w-xl px-4 py-24 text-center text-muted-foreground">
        Pregătim coșul tău…
      </div>
    );
  if (pendingPayment)
    return (
      <PaymentRecovery
        pending={pendingPayment}
        onDismiss={() => {
          try {
            sessionStorage.removeItem(pendingPaymentKey);
          } catch {
            /* Storage can be restricted by the browser. */
          }
          setPendingPayment(null);
          setSubmissionLocked(false);
          idempotencyKey.current = null;
          submissionBody.current = null;
        }}
        onPaid={() => {
          // Consume only purchased quantities; preserve other items added after checkout began.
          for (const purchased of pendingPayment.items) {
            const current = itemsDetailed.find((i) => i.id === purchased.id);
            if (current) setQty(current.id, Math.max(0, current.qty - purchased.qty));
          }
          try {
            sessionStorage.removeItem(pendingPaymentKey);
          } catch {
            /* Storage may be restricted. */
          }
        }}
      />
    );
  if (confirmation) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="wood-grain mx-auto flex h-16 w-16 items-center justify-center rounded-full text-[color:var(--gold)]">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="font-display mt-6 text-4xl">Comanda a intrat în poveste</h1>
        <p className="mt-3 text-muted-foreground">
          Comanda <strong>{confirmation.orderNumber}</strong> a fost înregistrată. Vei primi
          detaliile la adresa de e-mail completată.
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
            <span>
              {confirmation.shippingPending
                ? "Produse, fără livrare"
                : "Total de achitat la livrare"}
            </span>
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
    if (!config) return toast.error("Așteaptă încărcarea opțiunilor de plată și livrare.");
    if (!consent) return toast.error("Confirmă termenii comenzii și politica de retur.");
    if (totalQty === 0 && !submissionLocked) return toast.error("Coșul este gol.");
    if (submitting) return;
    if (!submissionLocked && paymentMethod === "card" && shippingCost == null)
      return toast.error("Confirmă costul livrării înainte de plata online.");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setSubmitting(true);
    setSubmissionLocked(true);
    try {
      if (!submissionBody.current)
        submissionBody.current = JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          website,
          customer: form,
          paymentMethod,
          shippingOption,
          paymentProvider: paymentMethod === "card" ? paymentProvider : undefined,
          shippingQuoteId: activeQuote?.id,
          expectedTotalBani: Math.round((totals.total + (shippingCost ?? 0)) * 100),
          checkoutConsentAccepted: true,
          checkoutConsentVersion: config.policies.checkoutConsentVersion,
          items: itemsDetailed.map((item) => ({ productId: item.id, quantity: item.qty })),
        });
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: submissionBody.current,
      });
      const payload = (await response.json()) as {
        data?: WebsiteOrderPublicResult;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        if (response.status >= 400 && response.status < 500) {
          setSubmissionLocked(false);
          idempotencyKey.current = null;
          submissionBody.current = null;
        }
        throw new Error(payload.error?.message || "Comanda nu a putut fi înregistrată.");
      }
      const result = payload.data;
      if (paymentMethod === "card") {
        const pending = {
          order: result,
          items: itemsDetailed.map((i) => ({ id: i.id, qty: i.qty })),
        };
        setPendingPayment(pending);
        try {
          sessionStorage.setItem(pendingPaymentKey, JSON.stringify(pending));
        } catch {
          throw new Error(
            "Browserul nu poate păstra sesiunea de plată. Permite stocarea pentru acest site înainte de a continua.",
          );
        }
        await openSecureCheckout(result);
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
            <ul inert={submissionLocked} className="mt-5 space-y-3">
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

          {!submissionLocked && recommendations.length > 0 && (
            <CartRecommendations
              products={recommendations}
              onAdd={(product) => {
                const added = addToCart(product.id);
                notifyAddedToCart(product.name, added);
              }}
            />
          )}

          <form
            id="checkout-form"
            onSubmit={submit}
            className="mt-8 space-y-7 sm:mt-10 sm:space-y-8"
          >
            {submissionLocked && (
              <p role="status" className="rounded-xl border border-amber-500/30 p-4 text-sm">
                Păstrăm datele comenzii cât timp verificăm trimiterea. Reîncearcă pentru a primi
                confirmarea aceleiași comenzi.
              </p>
            )}
            <fieldset
              disabled={submitting || submissionLocked}
              className="space-y-7 disabled:opacity-80"
            >
              <section className="rounded-2xl border border-[color:var(--gold)]/25 bg-card p-4 shadow-soft sm:p-5">
                <h2 className="font-display text-xl sm:text-2xl">
                  <span className="mr-2 text-[color:var(--gold)]">✦</span>Date de contact
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    Nume complet
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      aria-label="Nume complet"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nume complet"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm ">
                    E-mail
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
                  </label>
                  <label className="block text-sm ">
                    Telefon
                    <input
                      required
                      type="tel"
                      minLength={8}
                      maxLength={30}
                      autoComplete="tel"
                      inputMode="tel"
                      aria-label="Telefon"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Telefon"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm ">
                    Județ
                    <input
                      required
                      autoComplete="address-level1"
                      aria-label="Județ"
                      value={form.county}
                      onChange={(e) => setForm({ ...form, county: e.target.value })}
                      placeholder="Județ"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm ">
                    Localitate
                    <input
                      required
                      autoComplete="address-level2"
                      aria-label="Localitate"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Localitate"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    Adresă
                    <input
                      required
                      minLength={5}
                      maxLength={300}
                      autoComplete="street-address"
                      aria-label="Adresă"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Adresă (stradă, nr, bl, ap)"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm ">
                    {paymentMethod === "card" && paymentProvider === "revolut_pay"
                      ? "Cod poștal"
                      : "Cod poștal (opțional)"}
                    <input
                      required={paymentMethod === "card" && paymentProvider === "revolut_pay"}
                      pattern="[0-9]{6}"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      aria-label="Cod poștal"
                      value={form.postalCode}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      placeholder="Cod poștal (opțional)"
                      className={inputClass}
                    />
                  </label>
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
                  name="shipping-method"
                  selected={shippingOption === "home_delivery" && !activeQuote}
                  onChange={() => {
                    setShippingOption("home_delivery");
                    setQuote(null);
                  }}
                  icon={<PackageCheck className="h-5 w-5" />}
                  title="Curier la adresă"
                  note={
                    shippingCost == null
                      ? "Îți confirmăm costul înainte de expediere"
                      : activeQuote
                        ? "Tarif standard"
                        : shippingCost === 0
                          ? "Livrare gratuită"
                          : money(shippingCost)
                  }
                />
                {config?.shipping.liveQuotesEnabled && (
                  <CheckoutDelivery
                    key={deliveryContext}
                    request={deliveryRequest}
                    selected={activeQuote?.id}
                    onSelect={(offer) => setQuote({ offer, context: deliveryContext })}
                  />
                )}
              </ChoiceSection>

              <ChoiceSection title="Cum vrei să plătești?">
                <Choice
                  name="payment-method"
                  selected={paymentMethod === "cash_on_delivery"}
                  onChange={() => setPaymentMethod("cash_on_delivery")}
                  icon={<PackageCheck className="h-5 w-5" />}
                  title="La livrare"
                  note="Achită când primești cutiuța"
                />
                {config?.payments.options.map((option) => (
                  <Choice
                    key={option.id}
                    name="payment-method"
                    disabled={shippingCost == null && !config?.shipping.liveQuotesEnabled}
                    selected={paymentMethod === "card" && paymentProvider === option.id}
                    onChange={() => {
                      setPaymentMethod("card");
                      setPaymentProvider(option.id);
                    }}
                    icon={<CreditCard className="h-5 w-5" />}
                    title={option.label}
                    note={
                      shippingCost == null
                        ? config?.shipping.liveQuotesEnabled
                          ? "Alege curierul pentru a confirma totalul"
                          : "Disponibil după confirmarea costului de livrare"
                        : option.description
                    }
                  />
                ))}
                <p className="sm:col-span-2 text-xs leading-relaxed text-muted-foreground">
                  {paymentMethod === "card"
                    ? "Vei continua pe pagina securizată a procesatorului. Datele cardului nu sunt introduse sau stocate pe acest site."
                    : "Nu se retrage nicio sumă online. Plata se face la primirea coletului."}
                </p>
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
            </fieldset>
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
              disabled={submitting || (totalQty === 0 && !submissionLocked) || !config}
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
              <span>{money(totals.baseSubtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>Reducere aplicată</span>
                <span>−{money(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{activeQuote ? `Livrare · ${activeQuote.courier}` : "Livrare"}</span>
              <span>
                {shippingCost == null
                  ? "La confirmare"
                  : shippingCost === 0
                    ? "Gratuită"
                    : money(shippingCost)}
              </span>
            </div>
            <div className="font-display flex justify-between border-t border-border pt-3 text-xl">
              <span>{shippingCost == null ? "Produse, fără livrare" : "Total de plată"}</span>
              <span>{money(totals.total + (shippingCost ?? 0))}</span>
            </div>
          </div>
          {shippingCost == null && config && (
            <p className="mt-5 rounded-md bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              Costul livrării nu este inclus încă. Îți comunicăm totalul final și îți cerem acordul
              înainte de expediere.
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
                {shippingCost == null ? "Produse, fără livrare" : "Total de plată"}
              </div>
              <div className="font-display text-xl leading-tight tabular-nums">
                {money(totals.total + (shippingCost ?? 0))}
              </div>
            </div>
            <button
              form="checkout-form"
              type="submit"
              disabled={submitting || (totalQty === 0 && !submissionLocked) || !config}
              className="wood-grain ml-auto min-h-12 flex-1 rounded-full px-5 font-medium text-[color:var(--cream)] shadow-warm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Se procesează..."
                : paymentMethod === "card"
                  ? "Continuă la plată"
                  : "Comandă cu obligație de plată"}
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
    <fieldset className="rounded-2xl border border-[color:var(--gold)]/25 bg-card p-4 shadow-soft sm:p-5">
      <legend className="font-display text-xl sm:text-2xl">
        <span className="mr-2 text-[color:var(--gold)]">✦</span>
        {title}
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Choice({
  disabled,
  selected,
  onChange,
  icon,
  title,
  note,
  name,
}: {
  disabled?: boolean;
  name: string;
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
        name={name}
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
