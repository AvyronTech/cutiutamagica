import type { PaymentProvider } from "@/lib/checkout-settings";
import { CheckoutDelivery, type DeliveryOffer } from "@/components/site/CheckoutDelivery";
import { EasyboxPicker } from "@/components/site/EasyboxPicker";
import { PaymentRecovery } from "@/components/site/PaymentRecovery";
import { pendingPaymentKey, openSecureCheckout, type PendingPayment } from "@/lib/checkout-client";
import { notifyAddedToCart, notifyCheckoutDelivery, notifyCheckoutSecurity } from "@/lib/notify";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutoScroll from "embla-carousel-auto-scroll";
import {
  ArrowLeft,
  Check,
  Bookmark,
  CreditCard,
  Gift,
  Minus,
  MapPin,
  PackageCheck,
  Plus,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isAvailable, MAX_QTY, type Product } from "@/data/products";
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
import { ProductPrice } from "@/components/site/ProductPrice";
import { BrandMark } from "@/components/site/BrandMark";
import type { EasyboxLocker } from "@/lib/easybox";
import { trackGrowthEvent } from "@/lib/growth-events";

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
type AppliedPromotion = { code: string; label: string; discount: number; cartSignature: string };
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
  "mt-1.5 w-full rounded-xl border border-border bg-card/90 px-3 py-2.5 text-base outline-none transition focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/20 sm:text-sm";

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
    giftListDetailed,
    saveForGiftList,
    moveGiftToCart,
    removeFromGiftList,
    totalQty,
    clearCart,
    totals,
  } = useShop();
  const idempotencyKey = useRef<string | null>(null);
  const submissionBody = useRef<string | null>(null);
  const checkoutFinished = useRef(false);
  const abandonmentState = useRef({
    enabled: false,
    eventKey: "",
    value: 0,
    quantity: 0,
    itemKinds: 0,
  });
  const [config, setConfig] = useState<CommercePublicConfig | null>(null);
  const [confirmation, setConfirmation] = useState<WebsiteOrderPublicResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [shippingOption, setShippingOption] = useState<ShippingOption>("home_delivery");
  const [easyboxLocker, setEasyboxLocker] = useState<EasyboxLocker | null>(null);
  const [consent, setConsent] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("stripe");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [recovering, setRecovering] = useState(true);
  const [submissionLocked, setSubmissionLocked] = useState(false);
  const [quote, setQuote] = useState<{ offer: DeliveryOffer; context: string } | null>(null);
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const [promotionError, setPromotionError] = useState("");
  const [promotionExpanded, setPromotionExpanded] = useState(false);
  const [activeCheckoutStep, setActiveCheckoutStep] = useState(1);
  const cartSignature = JSON.stringify(itemsDetailed.map((item) => [item.id, item.qty]));
  const activePromotion =
    appliedPromotion?.cartSignature === cartSignature ? appliedPromotion : null;
  const productsAfterCode = Math.max(0, totals.total - (activePromotion?.discount ?? 0));
  const deliveryRequest = {
    customer: form,
    items: itemsDetailed.map((i) => ({ productId: i.id, quantity: i.qty })),
    paymentMethod,
    shippingOption,
    easyboxLockerId: shippingOption === "easybox" ? easyboxLocker?.id : undefined,
    promotionCode: activePromotion?.code,
  };
  const deliveryContext = JSON.stringify({ ...deliveryRequest, total: productsAfterCode });
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
  const checkoutHintsShown = useRef(false);

  useEffect(() => {
    if (totalQty < 1 || checkoutHintsShown.current) return;
    checkoutHintsShown.current = true;
    const deliveryHint = window.setTimeout(notifyCheckoutDelivery, 700);
    const securityHint = window.setTimeout(notifyCheckoutSecurity, 2400);
    return () => {
      window.clearTimeout(deliveryHint);
      window.clearTimeout(securityHint);
    };
  }, [totalQty]);

  useEffect(() => {
    if (confirmation || pendingPayment) checkoutFinished.current = true;
  }, [confirmation, pendingPayment]);

  useEffect(() => {
    if (recovering || totalQty < 1 || confirmation || pendingPayment) return;
    const eventKey = `checkout:${cartSignature}`;
    trackGrowthEvent("checkout_start", {
      value: totals.total,
      quantity: totalQty,
      once: `${eventKey}:start`,
    });
  }, [cartSignature, confirmation, pendingPayment, recovering, totalQty, totals.total]);

  abandonmentState.current = {
    enabled: !recovering && totalQty > 0 && !confirmation && !pendingPayment,
    eventKey: `checkout:${cartSignature}`,
    value: totals.total,
    quantity: totalQty,
    itemKinds: itemsDetailed.length,
  };

  useEffect(() => {
    const recordAbandonment = () => {
      const state = abandonmentState.current;
      if (checkoutFinished.current || !state.enabled) return;
      trackGrowthEvent("checkout_abandon", {
        value: state.value,
        quantity: state.quantity,
        properties: { itemKinds: state.itemKinds },
        once: `${state.eventKey}:abandon`,
        beacon: true,
      });
    };
    window.addEventListener("pagehide", recordAbandonment);
    return () => {
      window.removeEventListener("pagehide", recordAbandonment);
      recordAbandonment();
    };
  }, []);

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
    fetch("/api/v1/reviewer", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          data: { displayName: string; email: string } | null;
        };
      })
      .then((payload) => {
        if (!payload?.data) return;
        setForm((current) => ({
          ...current,
          name: current.name || payload.data!.displayName,
          email: current.email || payload.data!.email,
        }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const sections = [1, 2, 3]
      .map((step) => document.getElementById(`checkout-step-${step}`))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    let frame = 0;
    const updateActiveStep = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.45;
      const current = sections.reduce((active, section, index) => {
        return section.getBoundingClientRect().top <= readingLine ? index + 1 : active;
      }, 1);
      setActiveCheckoutStep(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveStep);
    };
    updateActiveStep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [recovering]);

  useEffect(() => {
    if (shippingOption === "easybox" && !config?.shipping.easyboxEnabled) {
      setShippingOption("home_delivery");
      setEasyboxLocker(null);
    }
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
    if (shippingOption === "easybox") return null;
    if (!config || config.shipping.requiresConfirmation) return null;
    if (config.shipping.freeOver != null && productsAfterCode >= config.shipping.freeOver) return 0;
    return config.shipping.standardPrice;
  }, [config, shippingOption, productsAfterCode, activeQuote]);

  async function applyPromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!promotionCode.trim()) return;
    setPromotionBusy(true);
    setPromotionError("");
    setQuote(null);
    try {
      const response = await fetch("/api/v1/promotions/validate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: promotionCode,
          email: form.email,
          phone: form.phone,
          items: itemsDetailed.map((item) => ({ productId: item.id, quantity: item.qty })),
        }),
      });
      const payload = (await response.json()) as {
        data?: { code: string; label: string; discount: number };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message || "Codul nu a putut fi aplicat.");
      }
      setPromotionCode(payload.data.code);
      setAppliedPromotion({ ...payload.data, cartSignature });
      toast.success(`${payload.data.label} a fost aplicat.`);
    } catch (error) {
      setAppliedPromotion(null);
      setPromotionError(error instanceof Error ? error.message : "Codul nu a putut fi aplicat.");
    } finally {
      setPromotionBusy(false);
    }
  }

  if (recovering)
    return (
      <div className="checkout-page">
        <CheckoutAtmosphere />
        <CheckoutMobileHeader totalQty={totalQty} />
        <div
          role="status"
          className="relative z-[1] mx-auto max-w-xl px-4 py-24 text-center text-muted-foreground"
        >
          Pregătim coșul tău…
        </div>
      </div>
    );
  if (pendingPayment)
    return (
      <div className="checkout-page">
        <CheckoutAtmosphere />
        <CheckoutMobileHeader totalQty={totalQty} />
        <div className="relative z-[1]">
          <PaymentRecovery
            pending={pendingPayment}
            onDismiss={() => {
              try {
                sessionStorage.removeItem(pendingPaymentKey);
              } catch {
                /* Storage can be restricted by the browser. */
              }
              setPendingPayment(null);
              checkoutFinished.current = false;
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
        </div>
      </div>
    );
  if (confirmation) {
    return (
      <div className="checkout-page checkout-confirmation-page">
        <CheckoutAtmosphere />
        <CheckoutMobileHeader totalQty={0} />
        <div className="relative z-[1] mx-auto max-w-xl px-4 py-20 text-center">
          <div className="wood-grain mx-auto flex h-16 w-16 items-center justify-center rounded-full text-[color:var(--gold)]">
            <Check className="h-8 w-8" />
          </div>
          <p className="checkout-confirmation-kicker">Comandă confirmată</p>
          <h1 className="font-display mt-2 text-4xl">Comanda a fost înregistrată</h1>
          <p className="mt-3 text-muted-foreground">
            Numărul comenzii este <strong>{confirmation.orderNumber}</strong>. Vei primi detaliile
            la adresa de e-mail completată.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ai nevoie de o corectare? Scrie-ne la{" "}
            <a className="underline" href="mailto:comenzi@cutiutamagica.eu">
              comenzi@cutiutamagica.eu
            </a>
            .
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
          {confirmation.shippingPending && (
            <p className="mt-4 rounded-xl border border-amber-600/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-950">
              Comanda este plasată. Îți comunicăm separat costul livrării, iar expedierea începe
              numai după acordul tău asupra totalului final.
            </p>
          )}
          <Link
            to="/produse"
            className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
          >
            Înapoi la cutiuțe
          </Link>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return toast.error("Așteaptă încărcarea opțiunilor de plată și livrare.");
    if (!consent) return toast.error("Confirmă termenii comenzii și politica de retur.");
    if (totalQty === 0 && !submissionLocked) return toast.error("Coșul este gol.");
    if (submitting) return;
    if (shippingOption === "easybox" && (!easyboxLocker || !activeQuote))
      return toast.error("Alege un easybox și confirmă tariful înainte de comandă.");
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
          easyboxLockerId: shippingOption === "easybox" ? easyboxLocker?.id : undefined,
          promotionCode: activePromotion?.code,
          expectedTotalBani: Math.round((productsAfterCode + (shippingCost ?? 0)) * 100),
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
        checkoutFinished.current = true;
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
      checkoutFinished.current = true;
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
    <div className="checkout-page">
      <CheckoutAtmosphere />
      <CheckoutMobileHeader totalQty={totalQty} />
      <div className="checkout-shell relative z-[1] mx-auto max-w-5xl px-4 pb-28 pt-16 sm:pt-20 lg:pb-16">
        <div className="checkout-layout grid gap-6 lg:grid-cols-[minmax(0,640px)_320px] lg:items-start lg:justify-center">
          <div className="min-w-0">
            <p className="checkout-kicker">Coșul tău · un ultim gest</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem]">
              Finalizează comanda
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {totalQty} {totalQty === 1 ? "cutiuță aleasă" : "cutiuțe alese"}. Verifică detaliile,
              apoi noi pregătim povestea pentru drum. Finalizezi ca invitat, fără să creezi cont.
            </p>
            <div className="checkout-assurances" aria-label="Avantajele comenzii">
              <span>✓ finalizare fără cont</span>
              <span>✦ verificare înainte de expediere</span>
              <span>♩ mecanism manual, fără baterii</span>
            </div>
            {itemsDetailed.length > 0 && (
              <div className="checkout-delivery-early" role="status">
                <PackageCheck className="h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <strong>Costul livrării, înainte de datele tale</strong>
                  <span>
                    {!config
                      ? "Încărcăm tariful real…"
                      : config.shipping.requiresConfirmation
                        ? "Îți comunicăm costul și totalul final înainte de expediere; nimic nu este adăugat pe ascuns."
                        : shippingCost === 0
                          ? "Livrare gratuită pentru această comandă."
                          : shippingCost != null
                            ? `${money(shippingCost)} prin curier${config.shipping.freeOver != null ? ` · gratuită de la ${money(config.shipping.freeOver)}` : ""}.`
                            : "Tariful exact este afișat imediat după alegerea adresei și a curierului."}
                  </span>
                </div>
              </div>
            )}
            {itemsDetailed.length > 0 && (
              <details className="checkout-mobile-order-review">
                <summary>
                  <span>
                    <ShoppingBag size={15} aria-hidden /> Comanda ta
                  </span>
                  <strong>
                    {totalQty} {totalQty === 1 ? "produs" : "produse"} · {money(totals.total)}
                  </strong>
                </summary>
                <ul>
                  {itemsDetailed.map((item) => (
                    <li key={item.id}>
                      <ProductImage
                        src={item.product.image}
                        alt=""
                        sizes="44px"
                        className="h-11 w-11 rounded-lg object-cover"
                      />
                      <div>
                        <strong>{item.product.name}</strong>
                        <ProductPrice
                          product={item.product}
                          quantity={item.qty}
                          size="compact"
                          showSavings={false}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={`Elimină ${item.product.name}`}
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                {totals.productDiscount > 0 && (
                  <div className="checkout-mobile-savings">
                    <span>Economisești la produse</span>
                    <strong>−{money(totals.productDiscount)}</strong>
                    <small>TVA inclus</small>
                  </div>
                )}
              </details>
            )}
            {itemsDetailed.length === 0 ? (
              <div className="checkout-empty mt-7 rounded-2xl border border-dashed border-[color:var(--gold)]/40 bg-card/85 p-8 text-center sm:p-10">
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
              <ul inert={submissionLocked} className="checkout-cart-list mt-5 space-y-2.5">
                {itemsDetailed.map((item) => (
                  <li
                    key={item.id}
                    className="checkout-cart-item flex gap-3 rounded-2xl border border-border bg-card/90 p-3"
                  >
                    <Link to="/produs/$id" params={{ id: item.product.id }} className="shrink-0">
                      <ProductImage
                        src={item.product.image}
                        alt={item.product.name}
                        sizes="88px"
                        className="h-20 w-20 rounded-xl bg-muted/40 object-cover sm:h-[5.5rem] sm:w-[5.5rem]"
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
                      <button
                        type="button"
                        onClick={() => saveForGiftList(item.id)}
                        className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-[11px] font-medium text-[color:var(--wood)] hover:underline"
                      >
                        <Bookmark className="h-3.5 w-3.5" aria-hidden /> Păstrează pentru mai târziu
                      </button>
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
                          <ProductPrice
                            product={item.product}
                            quantity={item.qty}
                            size="compact"
                            className="justify-end"
                          />
                          {item.qty > 1 && (
                            <div className="text-[11px] text-muted-foreground">
                              {money(item.product.price ?? 0)} / buc · TVA inclus
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {giftListDetailed.length > 0 && (
              <section className="checkout-gift-list mt-4" aria-labelledby="gift-list-title">
                <div className="checkout-gift-list__heading">
                  <span aria-hidden>
                    <Gift size={16} />
                  </span>
                  <div>
                    <h2 id="gift-list-title">Lista ta de cadouri</h2>
                    <p>Păstrată pe acest dispozitiv, fără cont.</p>
                  </div>
                </div>
                <ul>
                  {giftListDetailed.map((product) => (
                    <li key={product.id}>
                      <Link to="/produs/$id" params={{ id: product.id }}>
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          sizes="54px"
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                      </Link>
                      <div>
                        <Link to="/produs/$id" params={{ id: product.id }}>
                          {product.name}
                        </Link>
                        {product.price != null ? (
                          <ProductPrice product={product} size="compact" showSavings={false} />
                        ) : (
                          <span>În curând</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!isAvailable(product)}
                        onClick={() => {
                          if (moveGiftToCart(product.id))
                            toast.success("Cutiuța a revenit în povestea ta.", {
                              description: product.name,
                            });
                        }}
                      >
                        Pune în coș
                      </button>
                      <button
                        type="button"
                        aria-label={`Elimină ${product.name} din lista de cadouri`}
                        onClick={() => removeFromGiftList(product.id)}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {promotion && (
              <div className="checkout-volume-offer mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/10 p-3.5 text-left backdrop-blur-sm">
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

            <section className="checkout-promotion mt-4 rounded-xl border border-[color:var(--gold)]/25 bg-card/85 p-3.5 backdrop-blur-sm">
              <button
                type="button"
                className="checkout-promotion-toggle"
                aria-expanded={promotionExpanded || Boolean(activePromotion)}
                onClick={() => setPromotionExpanded((current) => !current)}
              >
                <span>
                  <TicketPercent className="h-4 w-4" aria-hidden />
                  {activePromotion ? `${activePromotion.code} aplicat` : "Ai un cod promoțional?"}
                </span>
                <span aria-hidden>{promotionExpanded || activePromotion ? "−" : "+"}</span>
              </button>
              {(promotionExpanded || activePromotion) &&
                (activePromotion ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
                    <span>
                      <strong>{activePromotion.code}</strong> · −{money(activePromotion.discount)}
                    </span>
                    <button
                      type="button"
                      aria-label="Elimină codul promoțional"
                      onClick={() => {
                        setAppliedPromotion(null);
                        setPromotionCode("");
                        setPromotionError("");
                        setQuote(null);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-emerald-500/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={applyPromotion} className="mt-3 flex gap-2">
                    <input
                      value={promotionCode}
                      onChange={(event) => {
                        setPromotionCode(event.target.value.toUpperCase());
                        setPromotionError("");
                      }}
                      minLength={4}
                      maxLength={40}
                      autoComplete="off"
                      placeholder="Ex. MAGIC-AB12CD34"
                      aria-label="Cod promoțional"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background/75 px-3 py-2.5 text-sm uppercase tracking-[0.08em] outline-none focus:border-[color:var(--gold)]"
                    />
                    <button
                      type="submit"
                      disabled={promotionBusy || !promotionCode.trim() || totalQty === 0}
                      className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {promotionBusy ? "Verificăm…" : "Aplică"}
                    </button>
                  </form>
                ))}
              {(promotionExpanded || activePromotion) && promotionError && (
                <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                  {promotionError}
                </p>
              )}
              {(promotionExpanded || activePromotion) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Codurile de recomandare apar numai după ce o comandă a fost livrată.
                </p>
              )}
            </section>

            {!submissionLocked && recommendations.length > 0 && (
              <CartRecommendations
                products={recommendations}
                onAdd={(product) => {
                  const added = addToCart(product.id);
                  notifyAddedToCart(product.name, added);
                }}
              />
            )}

            <nav className="checkout-mobile-steps" aria-label="Pașii finalizării comenzii">
              <span aria-current={activeCheckoutStep === 1 ? "step" : undefined}>
                <b>1</b>Date
              </span>
              <i aria-hidden />
              <span aria-current={activeCheckoutStep === 2 ? "step" : undefined}>
                <b>2</b>Livrare
              </span>
              <i aria-hidden />
              <span aria-current={activeCheckoutStep === 3 ? "step" : undefined}>
                <b>3</b>Plată
              </span>
            </nav>

            <form id="checkout-form" onSubmit={submit} className="checkout-form mt-7 space-y-5">
              {submissionLocked && (
                <p role="status" className="rounded-xl border border-amber-500/30 p-4 text-sm">
                  Păstrăm datele comenzii cât timp verificăm trimiterea. Reîncearcă pentru a primi
                  confirmarea aceleiași comenzi.
                </p>
              )}
              <fieldset
                disabled={submitting || submissionLocked}
                className="space-y-5 disabled:opacity-80"
              >
                <section
                  id="checkout-step-1"
                  className="checkout-contact rounded-2xl border border-[color:var(--gold)]/25 bg-card/90 p-4 shadow-soft backdrop-blur-md"
                >
                  <h2 className="checkout-step-heading font-display text-xl sm:text-2xl">
                    <span aria-hidden>1</span>
                    <span>
                      Date
                      <small>Doar informațiile necesare livrării</small>
                    </span>
                  </h2>
                  <div className="mt-3 grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-muted-foreground">
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
                    <label className="block text-xs font-medium text-muted-foreground">
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
                    <label className="block text-xs font-medium text-muted-foreground">
                      Telefon (pentru curier)
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
                    <label className="block text-xs font-medium text-muted-foreground">
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
                    <label className="block text-xs font-medium text-muted-foreground">
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
                    <label className="block text-xs font-medium text-muted-foreground sm:col-span-2">
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
                    <details
                      className="checkout-optional-fields sm:col-span-2"
                      open={
                        paymentMethod === "card" && paymentProvider === "revolut_pay"
                          ? true
                          : undefined
                      }
                    >
                      <summary>Detalii opționale: cod poștal sau mesaj cadou</summary>
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        <label className="block text-xs font-medium text-muted-foreground">
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
                            placeholder="Cod poștal"
                            className={inputClass}
                          />
                        </label>
                        <label className="block text-xs font-medium text-muted-foreground">
                          Mesaj cadou (opțional)
                          <textarea
                            aria-label="Mesaj cadou sau observații"
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Mesaj cadou sau observații"
                            rows={2}
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </details>
                  </div>
                </section>

                <ChoiceSection
                  step={2}
                  title="Livrare"
                  subtitle="Alegi cum ajunge povestea la tine"
                >
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
                  {config?.shipping.easyboxEnabled && (
                    <Choice
                      name="shipping-method"
                      selected={shippingOption === "easybox"}
                      onChange={() => {
                        setShippingOption("easybox");
                        setQuote(null);
                      }}
                      icon={<MapPin className="h-5 w-5" />}
                      title="SAMEDAY Easybox"
                      note={
                        activeQuote && shippingOption === "easybox"
                          ? activeQuote.price === 0
                            ? "Livrare gratuită"
                            : money(activeQuote.price)
                          : easyboxLocker
                            ? "Confirmă tariful punctului ales"
                            : "Alege punctul pe hartă"
                      }
                    />
                  )}
                  {shippingOption === "easybox" && config?.shipping.easyboxEnabled && (
                    <EasyboxPicker
                      selected={easyboxLocker}
                      searchHint={[form.city, form.county].filter(Boolean).join(", ")}
                      onSelect={(locker) => {
                        setEasyboxLocker(locker);
                        setQuote(null);
                      }}
                    />
                  )}
                  {(config?.shipping.liveQuotesEnabled ||
                    (shippingOption === "easybox" && Boolean(easyboxLocker))) && (
                    <CheckoutDelivery
                      key={deliveryContext}
                      request={deliveryRequest}
                      selected={activeQuote?.id}
                      onSelect={(offer) => setQuote({ offer, context: deliveryContext })}
                    />
                  )}
                </ChoiceSection>

                <ChoiceSection step={3} title="Plată" subtitle="Metoda și momentul plății, clar">
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

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/90 p-3.5 text-xs leading-relaxed sm:text-sm">
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

          <aside className="checkout-summary h-fit rounded-2xl border border-border bg-card/90 p-5 shadow-soft backdrop-blur-md lg:sticky lg:top-24">
            <h3 className="font-display text-xl sm:text-2xl">
              <span className="mr-2 text-[color:var(--gold)]">✦</span>Sumar
            </h3>
            <div className="mt-4 space-y-2 text-sm">
              {totals.productDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Preț anterior</span>
                  <del>{money(totals.referenceSubtotal)}</del>
                </div>
              )}
              {totals.productDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                  <span>Reduceri produse</span>
                  <span>−{money(totals.productDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Produse ({totalQty} buc)</span>
                <span>{money(totals.baseSubtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                  <span>Reducere aplicată</span>
                  <span>−{money(totals.discount)}</span>
                </div>
              )}
              {activePromotion && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                  <span>{activePromotion.label}</span>
                  <span>−{money(activePromotion.discount)}</span>
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
                <span>{money(productsAfterCode + (shippingCost ?? 0))}</span>
              </div>
              <p className="text-right text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                TVA inclus
              </p>
            </div>
            {shippingCost == null && config && (
              <p className="mt-5 rounded-md bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                Costul livrării nu este inclus încă. Îți comunicăm totalul final și îți cerem
                acordul înainte de expediere.
              </p>
            )}
          </aside>
        </div>

        {/* Bara de acțiune pe telefon: totalul rămâne vizibil, comanda se trimite de aici. */}
        {itemsDetailed.length > 0 && (
          <div className="checkout-mobile-bar fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--gold)]/30 bg-[color:var(--cream)]/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {shippingCost == null ? "Produse, fără livrare" : "Total de plată"}
                </div>
                <div className="font-display text-xl leading-tight tabular-nums">
                  {money(productsAfterCode + (shippingCost ?? 0))}
                </div>
              </div>
              <button
                form="checkout-form"
                type="submit"
                disabled={submitting || (totalQty === 0 && !submissionLocked) || !config}
                aria-label={
                  paymentMethod === "card"
                    ? "Continuă către plata securizată"
                    : "Comandă cu obligație de plată; achiți la livrare"
                }
                className="wood-grain checkout-mobile-submit ml-auto min-h-11 flex-1 rounded-full px-4 text-sm font-medium text-[color:var(--cream)] shadow-warm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  "Se procesează..."
                ) : paymentMethod === "card" ? (
                  <>
                    <strong>Continuă la plată</strong>
                    <small>pe pagina securizată</small>
                  </>
                ) : (
                  <>
                    <strong>Plasează comanda</strong>
                    <small>cu obligație de plată · achiți la livrare</small>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutAtmosphere() {
  return (
    <div className="checkout-atmosphere" aria-hidden="true">
      <span className="checkout-glow checkout-glow--one" />
      <span className="checkout-glow checkout-glow--two" />
      <span className="checkout-music checkout-music--one">♪</span>
      <span className="checkout-music checkout-music--two">♫</span>
      <span className="checkout-box checkout-box--one">
        <i />
      </span>
      <span className="checkout-box checkout-box--two">
        <i />
      </span>
      <span className="checkout-orbit" />
    </div>
  );
}

function CheckoutMobileHeader({ totalQty }: { totalQty: number }) {
  return (
    <div className="checkout-mobile-header">
      <Link to="/produse" aria-label="Înapoi la cutiuțe">
        <ArrowLeft size={17} />
      </Link>
      <BrandMark aria-hidden className="h-9 w-9" />
      <div>
        <strong>
          <ShieldCheck size={12} aria-hidden /> Checkout securizat
        </strong>
        <span>Fără cont · doar 3 pași</span>
      </div>
      <span className="checkout-mobile-header__count" aria-label={`${totalQty} produse în coș`}>
        <ShoppingBag size={14} aria-hidden /> {totalQty}
      </span>
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
    <section className="checkout-recommendations mt-7" aria-labelledby="cart-recommendations-title">
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
        opts={{ align: "start", loop: products.length > 1 }}
        plugins={plugins}
        className="px-1 sm:px-4"
        aria-label="Alte cutiuțe muzicale recomandate"
      >
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[72%] min-[480px]:basis-[56%] sm:basis-[44%] lg:basis-[42%]"
            >
              <article className="checkout-recommendation-card flex h-full overflow-hidden rounded-xl border border-[color:var(--gold)]/25 bg-card/90 shadow-sm">
                <Link
                  to="/produs/$id"
                  params={{ id: product.id }}
                  className="w-20 shrink-0 bg-[color:var(--gold)]/10 sm:w-24"
                  aria-label={`Vezi ${product.name}`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="h-full min-h-32 w-full object-contain p-1.5"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col p-2.5">
                  <Link to="/produs/$id" params={{ id: product.id }} className="hover:underline">
                    <h3 className="font-display text-sm leading-tight line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 hidden text-[11px] leading-snug text-muted-foreground line-clamp-2 sm:block">
                    {product.tagline}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-1.5 pt-2">
                    <ProductPrice product={product} size="compact" showSavings={false} />
                    <button
                      type="button"
                      onClick={() => onAdd(product)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition hover:brightness-110"
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

function ChoiceSection({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      id={`checkout-step-${step}`}
      className="rounded-2xl border border-[color:var(--gold)]/25 bg-card/90 p-4 shadow-soft backdrop-blur-md"
    >
      <legend className="checkout-step-heading font-display text-xl sm:text-2xl">
        <span aria-hidden>{step}</span>
        <span>
          {title}
          <small>{subtitle}</small>
        </span>
      </legend>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">{children}</div>
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
      className={`flex min-h-14 items-center gap-2.5 rounded-xl border p-3 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"} ${selected ? "border-primary bg-primary/5" : "border-border"}`}
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
