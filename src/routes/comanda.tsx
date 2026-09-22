import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CreditCard, Minus, PackageCheck, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { calcTotals, MAX_QTY, unitPriceBani } from "@/data/products";
import type { CommercePublicConfig } from "@/lib/commerce-operations-contracts";
import type { WebsiteOrderPublicResult } from "@/lib/order-contracts";
import { useShop } from "@/store/shop";

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
const inputClass = "rounded-md border border-border bg-card px-3 py-2.5 text-sm";

function money(value: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value);
}

function OrderPage() {
  const { itemsDetailed, setQty, removeFromCart, totalQty, clearCart } = useShop();
  const totals = calcTotals(
    itemsDetailed.map((item) => ({
      unitPriceBani: unitPriceBani(item.product),
      quantity: item.qty,
    })),
  );
  const idempotencyKey = useRef<string | null>(null);
  const [config, setConfig] = useState<CommercePublicConfig | null>(null);
  const [confirmation, setConfirmation] = useState<WebsiteOrderPublicResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [shippingOption, setShippingOption] = useState<ShippingOption>("home_delivery");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    fetch("/api/v1/commerce/config", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Config indisponibil");
        return (await response.json()) as { data: CommercePublicConfig };
      })
      .then(({ data }) => setConfig(data))
      .catch(() => toast.error("Opțiunile comerciale nu au putut fi încărcate."));
  }, []);

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
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <h1 className="font-display text-center text-5xl lg:text-left">Finalizează comanda</h1>
          <p className="mt-2 text-center text-muted-foreground lg:text-left">
            {totalQty} produs{totalQty === 1 ? "" : "e"} în coș.
          </p>
          {itemsDetailed.length === 0 ? (
            <div className="mt-12 rounded-xl border border-dashed border-border p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Coșul este gol.</p>
              <Link
                to="/produse"
                className="mt-5 inline-block rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground"
              >
                Vezi cutiuțele
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {itemsDetailed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-24 w-24 rounded-lg bg-muted/40 object-contain p-2"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg leading-tight">{item.product.name}</div>
                    <div className="text-xs text-muted-foreground">{item.product.melody}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Scade cantitatea"
                        onClick={() => setQty(item.id, Math.max(1, item.qty - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.qty}</span>
                      <button
                        type="button"
                        aria-label="Crește cantitatea"
                        onClick={() => setQty(item.id, Math.min(MAX_QTY, item.qty + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Elimină ${item.product.name}`}
                    onClick={() => removeFromCart(item.id)}
                    className="self-start p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-10 space-y-8">
            <section>
              <h2 className="font-display text-2xl">Date de contact și livrare</h2>
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

            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
              <input
                required
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                {config?.policies.checkoutConsentText ??
                  "Confirm datele comenzii și accept condițiile comerciale."}{" "}
                <Link to="/retur" className="underline">
                  Politica de retur și garanție
                </Link>{" "}
                face parte din informarea precontractuală.
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
            <button
              disabled={submitting || totalQty === 0 || !config}
              type="submit"
              className="wood-grain w-full rounded-md py-3.5 font-medium text-[color:var(--cream)] shadow-warm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Se procesează..."
                : paymentMethod === "card"
                  ? "Continuă către plata securizată"
                  : "Trimite comanda"}
            </button>
          </form>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h3 className="font-display text-2xl">Sumar</h3>
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
    </div>
  );
}

function ChoiceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
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
      className={`flex gap-3 rounded-lg border p-4 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"} ${selected ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <input type="radio" disabled={disabled} checked={selected} onChange={onChange} />
      {icon}
      <span>
        <strong className="block text-sm">{title}</strong>
        <span className="text-xs text-muted-foreground">{note}</span>
      </span>
    </label>
  );
}
