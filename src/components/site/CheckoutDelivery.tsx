import { useCallback, useEffect, useRef, useState } from "react";
import { websiteOrderInputSchema, type WebsiteOrderInput } from "@/lib/order-contracts";
export type DeliveryOffer = {
  id: string;
  courier: string;
  price: number;
  estimate: string | null;
  expiresAt: string;
  fixedFallback?: boolean;
};

function courierBrand(name: string): string {
  const normalized = name.toLocaleLowerCase("ro-RO");
  if (normalized.includes("sameday")) return "sameday";
  if (normalized.includes("fan courier") || normalized.includes("fancourier")) return "fan";
  if (normalized.includes("cargus")) return "cargus";
  if (normalized.includes("dpd")) return "dpd";
  if (normalized.includes("gls")) return "gls";
  if (normalized.includes("fedex")) return "fedex";
  if (normalized.includes("ptt")) return "ptt";
  return "standard";
}

function deliveryDate(estimate: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(estimate)
    ? new Intl.DateTimeFormat("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Bucharest",
      }).format(new Date(`${estimate}T12:00:00+03:00`))
    : estimate;
}
export function CheckoutDelivery({
  request,
  onSelect,
  selected,
  autoSelectBestOffer = false,
}: {
  request: Pick<
    WebsiteOrderInput,
    "customer" | "items" | "paymentMethod" | "shippingOption" | "promotionCode" | "easyboxLockerId"
  >;
  onSelect: (offer: DeliveryOffer) => void;
  selected: string | undefined;
  autoSelectBestOffer?: boolean;
}) {
  const [offers, setOffers] = useState<DeliveryOffer[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestKey = JSON.stringify(request);
  const canCalculate = websiteOrderInputSchema.safeParse({
    ...request,
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
    checkoutConsentAccepted: true,
    checkoutConsentVersion: "quote",
  }).success;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const calculate = useCallback(
    async (signal?: AbortSignal) => {
      setBusy(true);
      setError("");
      setOffers([]);
      try {
        const r = await fetch("/api/v1/shipping/quotes", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: requestKey,
          signal,
        });
        const data = (await r.json()) as { data?: DeliveryOffer[]; error?: { message: string } };
        if (!r.ok || !data.data)
          throw new Error(data.error?.message ?? "Nu am putut calcula livrarea.");
        if (!signal?.aborted) {
          setOffers(data.data);
          if (autoSelectBestOffer) {
            const bestOffer = data.data
              .filter((offer) => Date.parse(offer.expiresAt) > Date.now())
              .sort((left, right) => left.price - right.price)[0];
            if (bestOffer) onSelectRef.current(bestOffer);
          }
        }
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [autoSelectBestOffer, requestKey],
  );
  useEffect(() => {
    const controller = new AbortController();
    setOffers([]);
    setError("");
    if (!canCalculate) {
      setBusy(false);
      return () => controller.abort();
    }
    setBusy(true);
    const timer = setTimeout(() => void calculate(controller.signal), 1_100);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [calculate, canCalculate]);
  return (
    <div className="min-w-0 sm:col-span-2">
      <p className="text-sm text-muted-foreground">
        {request.shippingOption === "easybox"
          ? "Vezi prețul pentru punctul Easybox ales înainte de a plasa comanda."
          : "Alege oferta care ți se potrivește. Vezi prețul final și termenul estimat înainte de comandă."}
      </p>
      <button
        type="button"
        disabled={busy || !canCalculate}
        onClick={() => void calculate()}
        className="mt-3 min-h-11 rounded-full border border-[color:var(--gold)]/50 px-5 text-sm disabled:opacity-60"
      >
        {busy
          ? "Căutăm livrarea potrivită…"
          : request.shippingOption === "easybox"
            ? "Confirmă tariful Easybox"
            : "Actualizează ofertele de curierat"}
      </button>
      {!canCalculate && (
        <p className="mt-2 text-xs text-muted-foreground">
          {request.shippingOption === "easybox" && request.easyboxLockerId
            ? "Completează datele de contact și adresa pentru calculul tarifului punctului ales."
            : request.shippingOption === "easybox"
              ? "Completează datele de contact și adresa, apoi alege punctul Easybox pentru calculul livrării."
              : "Completează datele de contact și adresa pentru calculul livrării."}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </p>
      )}
      {offers.some((offer) => offer.fixedFallback) && (
        <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-200">
          Prețul afișat este final pentru această comandă. Îți confirmăm termenul de livrare la
          expediere.
        </p>
      )}
      {offers.length > 0 && (
        <p className="checkout-courier-heading">
          {request.shippingOption === "easybox"
            ? "Confirmă livrarea la Easybox:"
            : "Alege curierul potrivit:"}
        </p>
      )}
      <div className="mt-2 grid gap-2.5">
        {offers.map((offer) => (
          <label
            key={offer.id}
            className="checkout-courier-card"
            data-brand={courierBrand(
              request.shippingOption === "easybox" ? "SAMEDAY" : offer.courier,
            )}
            data-selected={selected === offer.id}
          >
            <input
              type="radio"
              name="shipping-offer"
              checked={selected === offer.id}
              onChange={() => onSelect(offer)}
              disabled={Date.parse(offer.expiresAt) <= Date.now()}
              className="checkout-courier-card__radio"
            />
            <span className="checkout-courier-card__body">
              <strong className="checkout-courier-card__name">
                {request.shippingOption === "easybox" ? "SAMEDAY Easybox" : offer.courier}
              </strong>
              {offer.estimate && (
                <span className="checkout-courier-card__estimate">
                  <span>Transport estimat după predare:</span>
                  <span>{deliveryDate(offer.estimate)}</span>
                </span>
              )}
              {offer.fixedFallback && (
                <span className="checkout-courier-card__fallback">
                  Preț final · termenul se confirmă la expediere
                </span>
              )}
            </span>
            <span className="checkout-courier-card__price">
              {offer.price === 0
                ? "Transport inclus"
                : new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(
                    offer.price,
                  )}
            </span>
          </label>
        ))}
      </div>
      {offers.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ofertele sunt valabile 10 minute. Pregătirea modelelor realizate la comandă poate adăuga
          timp înainte de predarea către curier.
        </p>
      )}
    </div>
  );
}
