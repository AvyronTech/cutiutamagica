import { useState } from "react";
import type { WebsiteOrderInput } from "@/lib/order-contracts";
export type DeliveryOffer = {
  id: string;
  courier: string;
  price: number;
  estimate: string | null;
  expiresAt: string;
};
export function CheckoutDelivery({
  request,
  onSelect,
  selected,
}: {
  request: Pick<
    WebsiteOrderInput,
    "customer" | "items" | "paymentMethod" | "shippingOption" | "promotionCode" | "easyboxLockerId"
  >;
  onSelect: (offer: DeliveryOffer) => void;
  selected: string | undefined;
}) {
  const [offers, setOffers] = useState<DeliveryOffer[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function calculate() {
    setBusy(true);
    setError("");
    setOffers([]);
    try {
      const r = await fetch("/api/v1/shipping/quotes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await r.json()) as { data?: DeliveryOffer[]; error?: { message: string } };
      if (!r.ok || !data.data)
        throw new Error(data.error?.message ?? "Nu am putut calcula livrarea.");
      setOffers(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-w-0 sm:col-span-2">
      <p className="text-sm text-muted-foreground">
        {request.shippingOption === "easybox"
          ? "Confirmăm disponibilitatea punctului ales și tariful final înainte de comandă."
          : "Completează adresa pentru a vedea curierii și costurile disponibile. La calcul, datele de livrare sunt transmise serviciului de curierat."}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void calculate()}
        className="mt-3 min-h-11 rounded-full border border-[color:var(--gold)]/50 px-5 text-sm disabled:opacity-60"
      >
        {busy
          ? "Căutăm livrarea potrivită…"
          : request.shippingOption === "easybox"
            ? "Confirmă tariful Easybox"
            : "Vezi opțiunile de curierat"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {offers.map((offer) => (
          <label
            key={offer.id}
            className={`flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3.5 sm:p-4 ${selected === offer.id ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <input
              type="radio"
              name="shipping-method"
              checked={selected === offer.id}
              onChange={() => onSelect(offer)}
              disabled={Date.parse(offer.expiresAt) <= Date.now()}
              className="h-5 w-5"
            />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">
                {request.shippingOption === "easybox" ? "SAMEDAY Easybox" : offer.courier}
              </strong>
              {offer.estimate && (
                <span className="text-xs text-muted-foreground">Estimare: {offer.estimate}</span>
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap text-sm font-medium">
              {offer.price === 0
                ? "Gratuit"
                : new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(
                    offer.price,
                  )}
            </span>
          </label>
        ))}
      </div>
      {offers.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ofertele sunt valabile 10 minute. Termenul estimat poate varia în funcție de curier.
        </p>
      )}
    </div>
  );
}
