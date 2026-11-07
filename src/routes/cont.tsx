import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  Box,
  CalendarDays,
  Camera,
  CreditCard,
  ChevronDown,
  LogOut,
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
import {
  clearCustomerSession,
  isCurrentCustomer,
  updateCurrentCustomer,
} from "@/lib/customer-session";
import { CustomerMagicCenter } from "@/components/site/CustomerMagicCenter";
import { seoHead } from "@/lib/seo-head";
import { PreviousPageLink } from "@/components/site/PreviousPageLink";
import { customerAccountSection, customerAccountSections } from "@/lib/customer-account";
import { customerLaunch } from "@/lib/customer-launch";
import { useShop } from "@/store/shop";

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
  const locationHash = useRouterState({ select: (state) => state.location.hash });
  const queryClient = useQueryClient();
  const section = customerAccountSection(locationHash);
  const { totalQty } = useShop();
  const [orderPage, setOrderPage] = useState(0);
  const account = useQuery({
    queryKey: ["reviewer"],
    queryFn: () => reviewApi<Reviewer | null>("/api/v1/reviewer"),
    retry: false,
    staleTime: 30_000,
  });
  const requests = useQuery({
    queryKey: ["personalization-requests", account.data?.id],
    queryFn: () => reviewApi<PersonalizationRequestSummary[]>("/api/v1/personalization/requests"),
    enabled: !!account.data,
    retry: false,
  });
  const billing = useQuery({
    queryKey: ["customer-billing", account.data?.id, orderPage],
    queryFn: () => reviewApi<CustomerBilling>(`/api/v1/customer/billing?page=${orderPage}`),
    enabled: !!account.data && (section === "comenzi" || section === "portofel"),
    retry: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cardConsent, setCardConsent] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardFeedback, setCardFeedback] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (locationHash.replace(/^#/, "") === "securitatea-contului") setSecurityOpen(true);
  }, [locationHash]);

  async function saveDisplayName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setProfileBusy(true);
    setProfileFeedback("");
    setProfileError("");
    try {
      const updated = await reviewApi<Reviewer>("/api/v1/reviewer/profile", {
        method: "POST",
        body: JSON.stringify({ displayName: form.get("displayName") }),
      });
      if (!updateCurrentCustomer(queryClient, updated)) return;
      setProfileFeedback("Numele afișat a fost actualizat.");
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : "Profilul nu a putut fi salvat.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function saveCustomerPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityBusy(true);
    setSecuritySaved(false);
    setSecurityError("");
    try {
      await reviewApi("/api/v1/reviewer/password", {
        method: "POST",
        body: JSON.stringify({ password: accountPassword, phone: accountPhone || undefined }),
      });
      setAccountPassword("");
      setSecuritySaved(true);
    } catch (caught) {
      setSecurityError(caught instanceof Error ? caught.message : "Parola nu a putut fi salvată.");
    } finally {
      setSecurityBusy(false);
    }
  }

  async function addCard() {
    const accountId = account.data?.id;
    if (!cardConsent) {
      setCardFeedback("Confirmă acordul pentru salvarea cardului, apoi continuă.");
      document.getElementById("wallet-card-consent")?.focus();
      return;
    }
    setCardBusy(true);
    setCardFeedback("");
    try {
      const result = await reviewApi<{ url: string }>("/api/v1/customer/billing/cards/setup", {
        method: "POST",
        body: JSON.stringify({ consent: cardConsent }),
      });
      if (accountId && isCurrentCustomer(queryClient, accountId))
        window.location.assign(result.url);
    } catch (caught) {
      setCardFeedback(
        caught instanceof Error ? caught.message : "Salvarea cardului nu poate fi pornită.",
      );
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
      await clearCustomerSession(queryClient);
      setAccountPassword("");
      setAccountPhone("");
      setSecurityOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deconectarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  }

  if (account.isLoading) {
    return (
      <div className="customer-account-page customer-account-loading">Se deschide contul tău…</div>
    );
  }

  if (account.isError) {
    return (
      <section className="customer-account-page" role="alert">
        <h1>Contul nu poate fi încărcat acum.</h1>
        <p>Reîncearcă pentru a-ți regăsi datele și comenzile.</p>
        <button
          className="magic-button"
          onClick={() => void account.refetch()}
          disabled={account.isFetching}
        >
          {account.isFetching ? "Se reîncearcă…" : "Reîncearcă"}
        </button>
      </section>
    );
  }

  if (!account.data) {
    const customerAuthMessage =
      auth === "neconfigurat"
        ? "Această opțiune de conectare nu este disponibilă. Încearcă o altă metodă."
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
            Un cont gratuit îți păstrează comenzile, preferințele și momentele importante aproape —
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
                <strong>Recenzii și preferințe</strong>
                <small>Publici recenzii și păstrezi preferințele pentru următorul cadou.</small>
              </div>
            </article>
          </div>
          <div className="customer-account-story__actions">
            <Link className="magic-button magic-button--outline" to="/magic-rewards">
              Descoperă Magic Rewards <ArrowRight size={17} />
            </Link>
            <Link to="/produse">Descoperă cutiuțele</Link>
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
            <h2 id="customer-auth-title">Intră în contul tău</h2>
            <p>Regăsește comenzile, momentele importante și beneficiile tale.</p>
            <Link className="customer-google-button" to="/auth">
              <span aria-hidden>✦</span> Intră în cont <ArrowRight size={16} />
            </Link>
            {customerAuthMessage && (
              <p className="personalization-error" role="alert">
                {customerAuthMessage}
              </p>
            )}
            <div className="customer-auth-assurance">
              <ShieldCheck aria-hidden />
              <span>
                Folosește parola contului sau opțiunile disponibile pe pagina de conectare.
              </span>
            </div>
            <p className="customer-auth-legal">
              Consultă{" "}
              <Link to="/politica-de-confidentialitate">Politica de confidențialitate</Link> pentru
              detalii despre datele tale.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="customer-account-page customer-dashboard" data-account-section={section}>
      <header className="customer-dashboard-header">
        <div>
          <p className="catalog-eyebrow">Contul meu</p>
          <h1>Bun venit, {account.data.displayName}.</h1>
          <p>{account.data.email}</p>
        </div>
        <div className="customer-dashboard-header__actions">
          <Link to="/produse" className="magic-button magic-button--outline">
            Vezi colecția <ArrowRight size={16} />
          </Link>
          <button className="customer-signout" onClick={() => void logout()} disabled={busy}>
            <LogOut size={16} /> {busy ? "Se închide…" : "Deconectare"}
          </button>
        </div>
      </header>

      {error && (
        <p className="personalization-error" role="alert">
          {error}
        </p>
      )}

      {card === "return" && (
        <p className="customer-account-notice" role="status">
          Configurarea s-a încheiat. Cardul va apărea în Portofel după confirmare; reîncarcă pagina
          dacă încă nu îl vezi.
        </p>
      )}
      {card === "cancelled" && (
        <p className="customer-account-notice" role="status">
          Salvarea cardului a fost anulată. Nu s-a făcut nicio plată.
        </p>
      )}

      <nav className="customer-account-nav" aria-label="Secțiunile contului">
        {customerAccountSections.map((item) => (
          <Link
            key={item.id}
            to="/cont"
            hash={item.id}
            activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
            resetScroll={false}
            hashScrollIntoView={false}
            aria-current={section === item.id ? "location" : undefined}
          >
            {item.label}
          </Link>
        ))}
        {requests.data?.length || requests.isError ? (
          <Link
            to="/cont"
            hash="cereri"
            activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
            resetScroll={false}
            hashScrollIntoView={false}
            aria-current={section === "cereri" ? "location" : undefined}
          >
            Cererile mele
          </Link>
        ) : null}
      </nav>

      <section
        className="customer-profile-panel"
        hidden={section !== "profil"}
        aria-label="Profil și acces"
      >
        <form
          className="customer-profile-identity"
          onSubmit={(event) => void saveDisplayName(event)}
        >
          <h2>Datele contului</h2>
          <label>
            Nume afișat
            <input
              name="displayName"
              defaultValue={account.data.displayName}
              onChange={() => {
                setProfileFeedback("");
                setProfileError("");
              }}
              key={account.data.id}
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label>
            E-mail pentru conectare
            <input type="email" value={account.data.email} autoComplete="username" readOnly />
          </label>
          <button className="magic-button" disabled={profileBusy}>
            {profileBusy ? "Se salvează…" : "Salvează numele"}
          </button>
          {profileFeedback && <p role="status">{profileFeedback}</p>}
          {profileError && (
            <p className="personalization-error" role="alert">
              {profileError}
            </p>
          )}
        </form>

        <details
          id="profil"
          className="customer-security customer-security--compact"
          open={securityOpen}
          onToggle={(event) => setSecurityOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <h2 id="customer-security-title">Parolă și telefon</h2>
              <small>Schimbi datele de acces numai când ai nevoie</small>
            </span>
            <ChevronDown size={18} aria-hidden />
          </summary>
          <form onSubmit={(event) => void saveCustomerPassword(event)}>
            <p>Setează o parolă pentru acces rapid. Telefonul este opțional.</p>
            <label>
              E-mail pentru conectare
              <input
                type="email"
                name="username"
                value={account.data.email}
                autoComplete="username"
                readOnly
              />
            </label>
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
            {securityError && (
              <p className="personalization-error" role="alert">
                {securityError}
              </p>
            )}
            {securitySaved && (
              <p role="status">Parola a fost salvată. O poți folosi la următoarea conectare.</p>
            )}
          </form>
        </details>
      </section>

      <CustomerMagicCenter key={account.data.id} accountId={account.data.id} section={section} />

      <section
        id="comenzi"
        className="customer-requests"
        hidden={section !== "comenzi"}
        aria-labelledby="customer-orders-title"
      >
        <div className="customer-requests-heading">
          <div>
            <p className="catalog-eyebrow">Activitatea ta</p>
            <h2 id="customer-orders-title">Comenzi</h2>
          </div>
        </div>
        {billing.isLoading ? (
          <p>Se încarcă situația contului…</p>
        ) : billing.isError ? (
          <div className="personalization-error" role="alert">
            <p>Situația comenzilor nu poate fi încărcată acum.</p>
            <button
              className="magic-button magic-button--outline"
              onClick={() => void billing.refetch()}
              disabled={billing.isFetching}
            >
              {billing.isFetching ? "Se reîncearcă…" : "Reîncearcă"}
            </button>
          </div>
        ) : (
          <div className="customer-billing-grid grid gap-4">
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 lg:col-span-2">
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
                        {orderLabels[order.paymentStatus] ?? order.paymentStatus}
                        {(order.orderStatus !== "cancelled" ||
                          ["shipped", "delivered", "returned"].includes(
                            order.fulfillmentStatus,
                          )) && (
                          <>
                            {" · livrare "}
                            {orderLabels[order.fulfillmentStatus] ?? order.fulfillmentStatus}
                          </>
                        )}
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
                <div className="customer-orders-empty">
                  <p>Aici urmărești comenzile tale, plata și livrarea.</p>
                  <Link to="/produse" className="magic-button">
                    Alege prima cutiuță <ArrowRight size={16} />
                  </Link>
                </div>
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
          </div>
        )}
      </section>

      <section
        id="portofel"
        className="customer-requests"
        hidden={section !== "portofel"}
        aria-labelledby="customer-wallet-title"
      >
        <div className="customer-requests-heading">
          <div>
            <p className="catalog-eyebrow">Plăți rapide și sigure</p>
            <h2 id="customer-wallet-title">Portofel</h2>
          </div>
          <Link
            className="magic-button magic-button--outline"
            to={totalQty ? "/comanda" : "/produse"}
          >
            {totalQty ? "Continuă comanda" : "Vezi colecția"} <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={16} /> Datele complete ale cardului nu sunt stocate aici.
        </p>
        {billing.isLoading ? (
          <p>Se încarcă portofelul…</p>
        ) : billing.isError ? (
          <div className="personalization-error" role="alert">
            <p>Portofelul nu poate fi încărcat acum.</p>
            <button
              className="magic-button magic-button--outline"
              onClick={() => void billing.refetch()}
              disabled={billing.isFetching}
            >
              {billing.isFetching ? "Se reîncearcă…" : "Reîncearcă"}
            </button>
          </div>
        ) : (
          <div className="customer-billing-grid grid gap-4 lg:grid-cols-2">
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
                            : "Card salvat securizat"}
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
                <p className="mt-3 text-sm text-slate-600">Nu ai încă un card salvat.</p>
              )}
              {billing.data?.cardSavingEnabled && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                    <input
                      id="wallet-card-consent"
                      type="checkbox"
                      checked={cardConsent}
                      onChange={(event) => {
                        setCardConsent(event.target.checked);
                        setCardFeedback("");
                      }}
                      className="mt-1"
                    />
                    Sunt de acord să salvez acest card pentru plăți viitoare inițiate de mine.
                    Datele complete sunt păstrate securizat de procesatorul de plăți.
                  </label>
                  <button
                    type="button"
                    disabled={cardBusy}
                    onClick={() => void addCard()}
                    className="magic-button mt-3 disabled:opacity-50"
                  >
                    {cardBusy ? "Se deschide pagina securizată…" : "Adaugă card"}
                  </button>
                  {cardFeedback && (
                    <p className="mt-2 text-xs text-rose-700" role="alert">
                      {cardFeedback}
                    </p>
                  )}
                </div>
              )}
              {!billing.data?.cardSavingEnabled && (
                <p className="mt-3 text-xs text-slate-600" role="status">
                  Adăugarea unui card nu este disponibilă momentan. Poți folosi metodele afișate la
                  finalizarea comenzii.
                </p>
              )}
            </article>
            {!!billing.data?.subscriptions.length && (
              <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
                <Repeat2 aria-hidden />
                <h3 className="mt-3 font-semibold">Plăți recurente</h3>
                {billing.data?.subscriptions.length ? (
                  <ul className="mt-3 space-y-3 text-sm">
                    {billing.data.subscriptions.map((subscription) => (
                      <li key={subscription.id}>
                        <strong>{subscription.serviceName || subscription.label}</strong>
                        <span className="block text-slate-600">
                          {(
                            {
                              active: "Activ",
                              trialing: "Perioadă de probă",
                              past_due: "Plată în așteptare",
                              unpaid: "Neachitat",
                              paused: "În pauză",
                              incomplete: "În curs de activare",
                            } as Record<string, string>
                          )[subscription.status] ?? "În actualizare"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">Nu ai abonamente active.</p>
                )}
              </article>
            )}
          </div>
        )}
      </section>

      <section
        id="cereri"
        className="customer-requests"
        hidden={section !== "cereri"}
        aria-labelledby="customer-requests-title"
      >
        <div className="customer-requests-heading">
          <div>
            <p className="catalog-eyebrow">Atelierul tău</p>
            <h2 id="customer-requests-title">Cereri de personalizare</h2>
          </div>
          {customerLaunch.personalizationRequests && (
            <Link className="magic-button" to="/personalizeaza">
              Cerere nouă <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {requests.isLoading ? (
          <p>Se încarcă cererile…</p>
        ) : requests.isError ? (
          <div className="personalization-error" role="alert">
            <p>Cererile nu pot fi încărcate acum.</p>
            <button
              className="magic-button magic-button--outline"
              onClick={() => void requests.refetch()}
              disabled={requests.isFetching}
            >
              {requests.isFetching ? "Se reîncearcă…" : "Reîncearcă"}
            </button>
          </div>
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
            <h3>Nu ai cereri înregistrate.</h3>
            <p>
              Atelierul de personalizare este în pregătire. Între timp, descoperă colecția
              disponibilă.
            </p>
            <Link to="/produse">Vezi cutiuțele</Link>
          </div>
        )}
      </section>
    </div>
  );
}
