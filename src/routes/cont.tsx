import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
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
import { useEffect, useState } from "react";
import {
  formatPersonalizationPrice,
  personalizationMelodies,
  personalizationReference,
  type PersonalizationRequestSummary,
} from "@/lib/personalization";
import { reviewApi, type Reviewer } from "@/lib/reviews";
import { CustomerMagicCenter } from "@/components/site/CustomerMagicCenter";
import { seoHead } from "@/lib/seo-head";
import { PreviousPageLink } from "@/components/site/PreviousPageLink";

export const Route = createFileRoute("/cont")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { mod?: "creare"; auth?: "neconfigurat" | "eroare"; card?: "return" | "cancelled" } => ({
    ...(search.mod === "creare" ? { mod: "creare" as const } : {}),
    ...(search.auth === "neconfigurat" || search.auth === "eroare" ? { auth: search.auth } : {}),
    ...(search.card === "return" || search.card === "cancelled" ? { card: search.card } : {}),
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
    fulfillmentStatus: string;
    items: Array<{ name: string; quantity: number; totalBani: number }>;
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
  cardSavingEnabled: boolean;
  orderPage: number;
  hasMoreOrders: boolean;
};

const orderLabels: Record<string, string> = {
  draft: "În pregătire",
  pending: "Primită",
  confirmed: "Confirmată",
  processing: "În lucru",
  completed: "Finalizată",
  cancelled: "Anulată",
  unpaid: "neachitată",
  authorized: "autorizată",
  paid: "achitată",
  partially_refunded: "rambursată parțial",
  refunded: "rambursată",
  failed: "eșuată",
  unfulfilled: "în așteptare",
  reserved: "rezervată",
  picking: "în pregătire",
  packed: "ambalată",
  shipped: "expediată",
  delivered: "livrată",
  returned: "returnată",
};

function CustomerAccount() {
  const { auth, card } = Route.useSearch();
  const queryClient = useQueryClient();
  const [orderPage, setOrderPage] = useState(0);
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
    queryKey: ["customer-billing", orderPage],
    queryFn: () => reviewApi<CustomerBilling>(`/api/v1/customer/billing?page=${orderPage}`),
    enabled: !!account.data,
    retry: false,
  });
  const providers = useQuery({
    queryKey: ["reviewer-auth-providers"],
    queryFn: () =>
      reviewApi<{
        google: { enabled: boolean };
        apple: { enabled: boolean };
        email: { enabled: boolean };
      }>("/api/v1/reviewer/providers"),
    retry: false,
    staleTime: 60_000,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cardConsent, setCardConsent] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);

  useEffect(() => {
    if (!account.data || window.location.hash !== "#securitatea-contului") return;
    const frame = requestAnimationFrame(() =>
      document.getElementById("securitatea-contului")?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [account.data]);

  async function saveCustomerPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityBusy(true);
    setSecuritySaved(false);
    setError("");
    try {
      await reviewApi("/api/v1/reviewer/password", {
        method: "POST",
        body: JSON.stringify({ password: accountPassword, phone: accountPhone || undefined }),
      });
      setAccountPassword("");
      setSecuritySaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Parola nu a putut fi salvată.");
    } finally {
      setSecurityBusy(false);
    }
  }

  async function addCard() {
    setCardBusy(true);
    setError("");
    try {
      const result = await reviewApi<{ url: string }>("/api/v1/customer/billing/cards/setup", {
        method: "POST",
        body: JSON.stringify({ consent: cardConsent }),
      });
      window.location.assign(result.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvarea cardului nu poate fi pornită.");
      setCardBusy(false);
    }
  }

  async function removeCard(id: string) {
    setCardBusy(true);
    setError("");
    try {
      await reviewApi(`/api/v1/customer/billing/cards/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["customer-billing"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cardul nu poate fi eliminat acum.");
    } finally {
      setCardBusy(false);
    }
  }

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
    const appleReady = providers.data?.apple.enabled === true;
    const emailReady = providers.data?.email.enabled === true;
    const customerAuthMessage =
      auth === "neconfigurat"
        ? "Conectarea nu este disponibilă momentan. Poți continua cumpărăturile fără cont."
        : auth === "eroare"
          ? "Autentificarea externă nu a putut fi finalizată. Încearcă din nou."
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
          <PreviousPageLink
            fallbackTo="/"
            fallbackLabel="Înapoi acasă"
            className="customer-account-inline-back"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </PreviousPageLink>
          <p className="catalog-eyebrow">
            <Sparkles size={14} /> Poveștile tale, într-un singur loc
          </p>
          <h1>
            Mai simplu să dăruiești. <em>Mai ușor să-ți amintești.</em>
          </h1>
          <p>
            Un cont gratuit îți păstrează cererile, preferințele și momentele importante aproape —
            într-un singur loc.
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
                : emailReady || googleReady || appleReady
                  ? "Intră în contul tău"
                  : "Conturile Magic se deschid în curând"}
            </h2>
            <p>
              {emailReady || googleReady || appleReady
                ? "La prima vizită, contul se creează automat. Dacă ai revenit, îți regăsești comenzile și momentele salvate."
                : "Până atunci poți descoperi colecția și poți finaliza orice comandă rapid, fără cont."}
            </p>
            {providers.isLoading ? (
              <span className="customer-google-button" aria-busy="true">
                <span aria-hidden>✦</span>
                Se verifică accesul…
              </span>
            ) : emailReady || googleReady || appleReady ? (
              <Link className="customer-google-button" to="/auth">
                <span aria-hidden>✦</span>
                Intră în cont
                <ArrowRight size={16} />
              </Link>
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
            {(emailReady || googleReady || appleReady) && (
              <>
                <div className="customer-auth-assurance">
                  <ShieldCheck aria-hidden />
                  <span>Poți intra cu parolă, cod pe e-mail sau cu un cont extern configurat.</span>
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

      {card === "return" && (
        <p className="customer-account-notice" role="status">
          Stripe a încheiat configurarea. Cardul va apărea aici după confirmarea securizată;
          reîncarcă pagina dacă încă nu îl vezi.
        </p>
      )}
      {card === "cancelled" && (
        <p className="customer-account-notice" role="status">
          Salvarea cardului a fost anulată. Nu s-a făcut nicio plată.
        </p>
      )}

      <section
        id="securitatea-contului"
        className="customer-security"
        aria-labelledby="customer-security-title"
      >
        <div>
          <p className="catalog-eyebrow">Accesul tău</p>
          <h2 id="customer-security-title">Securitatea contului</h2>
          <p>
            Setează sau schimbă parola. Poți adăuga și un număr pentru conectare cu aceeași parolă.
          </p>
        </div>
        <form onSubmit={(event) => void saveCustomerPassword(event)}>
          <label>
            Parolă nouă (minimum 12 caractere)
            <span className="customer-security__password">
              <input
                type={showAccountPassword ? "text" : "password"}
                value={accountPassword}
                onChange={(event) => setAccountPassword(event.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
              <button
                type="button"
                onClick={() => setShowAccountPassword(!showAccountPassword)}
                aria-label={showAccountPassword ? "Ascunde parola" : "Arată parola"}
              >
                {showAccountPassword ? "Ascunde" : "Arată"}
              </button>
            </span>
          </label>
          <label>
            Telefon pentru conectare (opțional)
            <input
              type="tel"
              value={accountPhone}
              onChange={(event) => setAccountPhone(event.target.value)}
              autoComplete="tel"
              placeholder="07… sau +40…"
              maxLength={32}
            />
          </label>
          <button type="submit" disabled={securityBusy || accountPassword.length < 12}>
            {securityBusy ? "Se salvează…" : "Salvează parola"}
          </button>
          {securitySaved && (
            <p role="status">Parola a fost salvată. O poți folosi la următoarea conectare.</p>
          )}
        </form>
      </section>

      <CustomerMagicCenter />

      <section className="customer-requests" aria-labelledby="customer-billing-title">
        <div className="customer-requests-heading">
          <div>
            <p className="catalog-eyebrow">Comenzi și facturare</p>
            <h2 id="customer-billing-title">Comenzi și plăți</h2>
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
          <div className="customer-billing-grid grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 lg:col-span-2">
              <ReceiptText aria-hidden />
              <h3 className="mt-3 font-semibold">Comenzile mele</h3>
              {billing.data?.orders.length ? (
                <ul className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  {billing.data.orders.map((order) => (
                    <li
                      key={order.orderNumber}
                      className="rounded-xl border border-slate-200 bg-white/75 p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong>{order.orderNumber}</strong>
                        <time dateTime={order.placedAt} className="text-xs text-slate-500">
                          {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(
                            new Date(order.placedAt),
                          )}
                        </time>
                      </div>
                      <strong className="mt-2 block text-slate-800">
                        {(order.totalBani / 100).toLocaleString("ro-RO", {
                          style: "currency",
                          currency: order.currency,
                        })}
                      </strong>
                      <p className="mt-1 text-xs text-slate-600">
                        {orderLabels[order.orderStatus] ?? order.orderStatus} · plată{" "}
                        {orderLabels[order.paymentStatus] ?? order.paymentStatus} · livrare{" "}
                        {orderLabels[order.fulfillmentStatus] ?? order.fulfillmentStatus}
                      </p>
                      {order.items.length > 0 && (
                        <ul className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">
                          {order.items.map((item, index) => (
                            <li key={`${index}-${item.name}`}>
                              {item.quantity} × {item.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Nu există încă o comandă asociată.</p>
              )}
              {(orderPage > 0 || billing.data?.hasMoreOrders) && (
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    className="text-amber-800 underline disabled:opacity-40"
                    disabled={orderPage === 0 || billing.isFetching}
                    onClick={() => setOrderPage((page) => page - 1)}
                  >
                    Mai noi
                  </button>
                  <span>Pagina {orderPage + 1}</span>
                  <button
                    type="button"
                    className="text-amber-800 underline disabled:opacity-40"
                    disabled={!billing.data?.hasMoreOrders || billing.isFetching}
                    onClick={() => setOrderPage((page) => page + 1)}
                  >
                    Mai vechi
                  </button>
                </div>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
              <CreditCard aria-hidden />
              <h3 className="mt-3 font-semibold">Metode salvate</h3>
              {billing.data?.paymentMethods.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {billing.data.paymentMethods.map((method) => (
                    <li
                      key={method.id}
                      className="flex items-start justify-between gap-2 border-t border-slate-200 pt-2"
                    >
                      <span>
                        <strong>{method.displayLabel}</strong>
                        <span className="block text-slate-600">
                          {method.expiryMonth && method.expiryYear
                            ? `Expiră ${String(method.expiryMonth).padStart(2, "0")}/${method.expiryYear}`
                            : "Card tokenizat la Stripe"}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={cardBusy}
                        onClick={() => void removeCard(method.id)}
                        className="text-xs font-semibold text-rose-700 hover:underline"
                      >
                        Elimină
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Salvarea cardului va deveni disponibilă după conectarea procesatorului ales.
                </p>
              )}
              {billing.data?.cardSavingEnabled && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                    <input
                      type="checkbox"
                      checked={cardConsent}
                      onChange={(event) => setCardConsent(event.target.checked)}
                      className="mt-1"
                    />
                    Solicit salvarea cardului la Stripe pentru plăți viitoare inițiate de mine.
                    Datele complete ale cardului rămân la Stripe.
                  </label>
                  <button
                    type="button"
                    disabled={!cardConsent || cardBusy}
                    onClick={() => void addCard()}
                    className="magic-button mt-3 disabled:opacity-50"
                  >
                    Adaugă card prin Stripe
                  </button>
                </div>
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
