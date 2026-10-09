import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Box,
  CalendarDays,
  Camera,
  CreditCard,
  LogOut,
  ReceiptText,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import {
  formatPersonalizationPrice,
  personalizationMelodies,
  personalizationReference,
  type PersonalizationRequestSummary,
} from "@/lib/personalization";
import { reviewApi, type Reviewer } from "@/lib/reviews";
import { CustomerMagicCenter } from "@/components/site/CustomerMagicCenter";
import { seoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/cont")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { mod?: "creare"; auth?: "neconfigurat" | "eroare" } => ({
    ...(search.mod === "creare" ? { mod: "creare" as const } : {}),
    ...(search.auth === "neconfigurat" || search.auth === "eroare" ? { auth: search.auth } : {}),
  }),
  component: CustomerAccount,
  head: () =>
    seoHead({
      title: "Contul meu | Cutiuța Magică",
      description:
        "Spațiul tău Cutiuța Magică pentru comenzi, Magic Stars, calendarul cadourilor, recenzii și preferințe.",
      path: "/cont",
      imageAlt: "Contul Cutiuța Magică pentru comenzi și beneficii",
      robots: "noindex, nofollow",
    }),
});

const statusLabels: Record<PersonalizationRequestSummary["status"], string> = {
  received: "Primită",
  contacted: "Contactată",
  approved: "Confirmată",
  in_production: "În lucru",
  shipped: "Expediată",
  cancelled: "Anulată",
};

type CustomerBilling = {
  orders: Array<{
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    totalBani: number;
    currency: string;
    placedAt: string;
  }>;
  paymentMethods: Array<{
    id: string;
    provider: string;
    displayLabel: string;
    brand: string | null;
    last4: string | null;
    expiryMonth: number | null;
    expiryYear: number | null;
    isDefault: number;
    status: string;
  }>;
  subscriptions: Array<{
    id: string;
    provider: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: number;
    label: string;
    serviceName: string | null;
    unitAmountBani: number;
    currency: string;
    intervalUnit: string;
    intervalCount: number;
  }>;
};

function CustomerAccount() {
  const { auth } = Route.useSearch();
  const queryClient = useQueryClient();
  const account = useQuery({
    queryKey: ["reviewer"],
    queryFn: () => reviewApi<Reviewer | null>("/api/v1/reviewer"),
    retry: false,
    staleTime: 30_000,
  });
  const requests = useQuery({
    queryKey: ["personalization-requests"],
    queryFn: () => reviewApi<PersonalizationRequestSummary[]>("/api/v1/personalization/requests"),
    enabled: !!account.data,
    retry: false,
  });
  const billing = useQuery({
    queryKey: ["customer-billing"],
    queryFn: () => reviewApi<CustomerBilling>("/api/v1/customer/billing"),
    enabled: !!account.data,
    retry: false,
  });
  const providers = useQuery({
    queryKey: ["reviewer-auth-providers"],
    queryFn: () => reviewApi<{ google: { enabled: boolean } }>("/api/v1/reviewer/providers"),
    retry: false,
    staleTime: 60_000,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    try {
      await reviewApi("/api/v1/reviewer/logout", { method: "POST" });
      queryClient.setQueryData(["reviewer"], null);
      queryClient.removeQueries({ queryKey: ["personalization-requests"] });
      queryClient.removeQueries({ queryKey: ["customer-billing"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deconectarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  }

  if (account.isLoading) {
    return <div className="customer-account-loading">Se deschide contul tău…</div>;
  }

  if (!account.data) {
    const googleReady = providers.data?.google.enabled === true;
    const customerAuthMessage =
      auth === "neconfigurat"
        ? "Conectarea nu este disponibilă momentan. Poți continua cumpărăturile fără cont."
        : auth === "eroare"
          ? "Autentificarea Google nu a putut fi finalizată. Încearcă din nou."
          : "";
    return (
      <div className="customer-account-page customer-account-page--guest">
        <div className="customer-account-atmosphere" aria-hidden>
          <i />
          <i />
          <i />
          <span className="customer-account-orbit customer-account-orbit--one" />
          <span className="customer-account-orbit customer-account-orbit--two" />
        </div>
        <section className="customer-account-story">
          <p className="catalog-eyebrow">
            <Sparkles size={14} /> Poveștile tale, într-un singur loc
          </p>
          <h1>
            Mai simplu să dăruiești. <em>Mai ușor să-ți amintești.</em>
          </h1>
          <p>
            Un cont gratuit îți păstrează cererile, preferințele și momentele importante aproape —
            fără încă o parolă de memorat.
          </p>
          <div className="customer-account-benefits">
            <article>
              <span>
                <Star />
              </span>
              <div>
                <strong>Magic Stars ✦</strong>
                <small>Contul, comenzile, recenziile aprobate și distribuirile adună stele.</small>
              </div>
            </article>
            <article>
              <span>
                <CalendarDays />
              </span>
              <div>
                <strong>Momente importante</strong>
                <small>Păstrezi ideile și ocaziile care merită un cadou memorabil.</small>
              </div>
            </article>
            <article>
              <span>
                <Camera />
              </span>
              <div>
                <strong>Povești și personalizări</strong>
                <small>Urmărești cererile și publici mai ușor o recenzie autentică.</small>
              </div>
            </article>
          </div>
          <div className="customer-account-story__actions">
            <Link className="magic-button magic-button--outline" to="/magic-rewards">
              Descoperă Magic Rewards <ArrowRight size={17} />
            </Link>
            <Link to="/personalizeaza">Personalizează o cutiuță</Link>
          </div>
        </section>

        <section
          className="customer-auth-card customer-auth-card--dimensional"
          aria-labelledby="customer-auth-title"
        >
          <div className="customer-oauth-panel">
            <div className="customer-auth-icon" aria-hidden>
              <UserRound />
            </div>
            <p className="customer-auth-kicker">Logare și înregistrare</p>
            <h2 id="customer-auth-title">
              {providers.isLoading
                ? "Verificăm accesul securizat…"
                : googleReady
                  ? "Un singur pas, cu Google"
                  : "Conturile Magic se deschid în curând"}
            </h2>
            <p>
              {googleReady
                ? "Dacă e prima vizită, contul se creează automat. Dacă ai revenit, intri direct în poveștile tale."
                : "Până atunci poți descoperi colecția și poți finaliza orice comandă rapid, fără cont."}
            </p>
            {providers.isLoading ? (
              <span className="customer-google-button" aria-busy="true">
                <span aria-hidden>✦</span>
                Se verifică accesul…
              </span>
            ) : googleReady ? (
              <a className="customer-google-button" href="/api/v1/reviewer/oauth/google">
                <span aria-hidden>G</span>
                Continuă cu Google
                <ArrowRight size={16} />
              </a>
            ) : (
              <Link className="customer-google-button" to="/produse">
                <span aria-hidden>✦</span>
                Descoperă cutiuțele
                <ArrowRight size={16} />
              </Link>
            )}
            {customerAuthMessage && (
              <p className="personalization-error" role="alert">
                {customerAuthMessage}
              </p>
            )}
            {googleReady && (
              <>
                <div className="customer-auth-assurance">
                  <ShieldCheck aria-hidden />
                  <span>
                    Nu îți cerem o parolă nouă. Folosim doar identitatea, numele și adresa
                    confirmată de Google.
                  </span>
                </div>
                <p className="customer-auth-legal">
                  Continuând, accepți crearea contului și confirmi că ai citit{" "}
                  <Link to="/politica-de-confidentialitate">Politica de confidențialitate</Link>.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="customer-account-page customer-dashboard">
      <header className="customer-dashboard-header">
        <div>
          <p className="catalog-eyebrow">Contul meu</p>
          <h1>Bun venit, {account.data.displayName}.</h1>
          <p>{account.data.email}</p>
        </div>
        <button
          className="magic-button magic-button--outline"
          onClick={() => void logout()}
          disabled={busy}
        >
          <LogOut size={16} /> Deconectare
        </button>
      </header>

      {error && (
        <p className="personalization-error" role="alert">
          {error}
        </p>
      )}

      <CustomerMagicCenter />

      <section className="customer-requests" aria-labelledby="customer-billing-title">
        <div className="customer-requests-heading">
          <div>
            <p className="catalog-eyebrow">Comenzi și facturare</p>
            <h2 id="customer-billing-title">Centrul tău de plată</h2>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={16} /> Datele complete ale cardului nu sunt stocate aici
          </span>
        </div>
        {billing.isLoading ? (
          <p>Se încarcă situația contului…</p>
        ) : billing.isError ? (
          <p className="personalization-error" role="alert">
            Situația comenzilor nu poate fi încărcată acum.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
              <ReceiptText aria-hidden />
              <h3 className="mt-3 font-semibold">Comenzile mele</h3>
              {billing.data?.orders.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {billing.data.orders.slice(0, 5).map((order) => (
                    <li key={order.orderNumber} className="border-t border-slate-200 pt-3">
                      <strong>{order.orderNumber}</strong>
                      <span className="block text-slate-600">
                        {(order.totalBani / 100).toLocaleString("ro-RO", {
                          style: "currency",
                          currency: order.currency,
                        })}{" "}
                        · {order.paymentStatus}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Nu există încă o comandă asociată.</p>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
              <CreditCard aria-hidden />
              <h3 className="mt-3 font-semibold">Metode salvate</h3>
              {billing.data?.paymentMethods.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {billing.data.paymentMethods.map((method) => (
                    <li key={method.id}>
                      <strong>{method.displayLabel}</strong>
                      <span className="block text-slate-600">
                        {method.brand || "Card"} {method.last4 ? `•••• ${method.last4}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Salvarea cardului va deveni disponibilă după conectarea procesatorului ales.
                </p>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
              <Repeat2 aria-hidden />
              <h3 className="mt-3 font-semibold">Plăți recurente</h3>
              {billing.data?.subscriptions.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {billing.data.subscriptions.map((subscription) => (
                    <li key={subscription.id}>
                      <strong>{subscription.serviceName || subscription.label}</strong>
                      <span className="block text-slate-600">{subscription.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Nu ai abonamente active. Activarea va cere consimțământ explicit.
                </p>
              )}
            </article>
          </div>
        )}
      </section>

      <section className="customer-requests" aria-labelledby="customer-requests-title">
        <div className="customer-requests-heading">
          <div>
            <p className="catalog-eyebrow">Atelierul tău</p>
            <h2 id="customer-requests-title">Cereri de personalizare</h2>
          </div>
          <Link className="magic-button" to="/personalizeaza">
            Cerere nouă <ArrowRight size={16} />
          </Link>
        </div>
        {requests.isLoading ? (
          <p>Se încarcă cererile…</p>
        ) : requests.isError ? (
          <p className="personalization-error" role="alert">
            Cererile nu pot fi încărcate acum. Reîncearcă.
          </p>
        ) : requests.data?.length ? (
          <div className="customer-request-list">
            {requests.data.map((request) => {
              const melody = personalizationMelodies.find((item) => item.id === request.melody);
              return (
                <article key={request.id}>
                  <div className={"customer-request-box customer-request-box--" + request.boxColor}>
                    <Box aria-hidden />
                  </div>
                  <div>
                    <p>{personalizationReference(request.id)}</p>
                    <h3>
                      Cutiuță {request.boxColor === "black" ? "neagră" : "galbenă"} ·{" "}
                      {melody?.label}
                    </h3>
                    <small>
                      {new Intl.DateTimeFormat("ro-RO", { dateStyle: "long" }).format(
                        new Date(request.createdAt),
                      )}
                      {request.giftWrap ? " · ambalare specială" : ""}
                    </small>
                  </div>
                  <div className="customer-request-state">
                    <span data-status={request.status}>{statusLabels[request.status]}</span>
                    <strong>{formatPersonalizationPrice(request.totalBani)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="customer-requests-empty">
            <Sparkles aria-hidden />
            <h3>Prima ta poveste poate începe aici.</h3>
            <p>Alege culoarea, melodia și fotografia care va sta pe capac.</p>
            <Link to="/personalizeaza">Personalizează acum</Link>
          </div>
        )}
      </section>
    </div>
  );
}
