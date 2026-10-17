import { PHONE_TEL } from "@/lib/whatsapp";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, LockKeyhole, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { pendingPaymentKey, openSecureCheckout, type PendingPayment } from "@/lib/checkout-client";
import type { PaymentStatus } from "@/lib/checkout-settings";
export function PaymentRecovery({
  pending,
  onPaid,
  onDismiss,
}: {
  pending: PendingPayment;
  onPaid: () => void;
  onDismiss: () => void;
}) {
  const [status, setStatus] = useState<PaymentStatus | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const notified = useRef(false),
    onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined,
      count = 0;
    async function check() {
      if (document.hidden) {
        timer = setTimeout(check, 3000);
        return;
      }
      try {
        const response = await fetch("/api/v1/payments/status", {
          method: "POST",
          credentials: "same-origin",
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orderId: pending.order.orderId,
            publicToken: pending.order.publicToken,
          }),
        });
        const result = (await response.json()) as { data?: PaymentStatus };
        if (!response.ok || !result.data) throw new Error("status");
        if (controller.signal.aborted) return;
        setStatus(result.data);
        setError(false);
        if (result.data.status === "paid" && !notified.current) {
          notified.current = true;
          onPaidRef.current();
        }
        if (result.data.status === "pending" && ++count < 10) timer = setTimeout(check, 3000);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [pending.order.orderId, pending.order.publicToken, refresh]);
  async function resume() {
    setBusy(true);
    try {
      sessionStorage.setItem(pendingPaymentKey, JSON.stringify(pending));
      await openSecureCheckout(pending.order);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }
  const paid = status?.status === "paid";
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="wood-grain mx-auto grid h-16 w-16 place-items-center rounded-full text-[color:var(--gold)]">
        {paid ? <Check className="h-8 w-8" /> : <LockKeyhole className="h-7 w-7" />}
      </div>
      <div role="status" aria-live="polite">
        <h1 className="font-display mt-6 text-4xl">
          {paid
            ? "Plata a fost confirmată"
            : status?.status === "cancelled"
              ? "Comanda a fost anulată"
              : status?.status === "refunded"
                ? "Plata a fost restituită"
                : "Cutiuța ta te așteaptă"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {paid
            ? "Mulțumim! Pregătim următorul pas al poveștii tale."
            : status?.status === "cancelled" || status?.status === "refunded"
              ? "Ne poți contacta dacă ai nevoie de ajutor."
              : "Comanda este păstrată. Dacă ai plătit deja, așteaptă confirmarea înainte de a relua plata."}
        </p>
        <p className="mt-5 text-sm">
          Comanda <strong>{status?.orderNumber ?? pending.order.orderNumber}</strong>
        </p>
        <p className="font-display mt-2 text-3xl">
          {new Intl.NumberFormat("ro-RO", {
            style: "currency",
            currency: status?.currency ?? pending.order.currency,
          }).format(status?.total ?? pending.order.total)}
        </p>
        {error && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-200">
            Confirmarea întârzie. Verifică din nou în câteva momente; nu este nevoie să creezi o
            altă comandă.
          </p>
        )}
      </div>
      {status?.canResume && !error && (
        <button
          disabled={busy}
          onClick={() => void resume()}
          className="wood-grain mt-6 w-full rounded-xl px-6 py-3.5 text-[color:var(--cream)] disabled:opacity-50"
        >
          {busy ? "Se deschide plata…" : "Reia plata securizată"}
        </button>
      )}
      {!paid && (
        <button
          onClick={() => setRefresh((n) => n + 1)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Verifică starea plății
        </button>
      )}
      {(status?.status === "cancelled" || status?.status === "refunded") && (
        <button
          onClick={onDismiss}
          className="mt-5 rounded-full border border-border px-5 py-3 text-sm"
        >
          Înapoi la coș
        </button>
      )}
      <div className="mt-7 flex justify-center gap-6 text-sm">
        <Link to="/produse" className="underline">
          Descoperă cutiuțele
        </Link>
        <a href={`tel:${PHONE_TEL}`} className="underline">
          Ai nevoie de ajutor?
        </a>
      </div>
    </section>
  );
}
