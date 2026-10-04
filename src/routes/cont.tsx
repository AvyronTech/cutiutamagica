import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Box,
  CalendarDays,
  Camera,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  formatPersonalizationPrice,
  personalizationMelodies,
  personalizationReference,
  type PersonalizationRequestSummary,
} from "@/lib/personalization";
import { reviewApi, type Reviewer } from "@/lib/reviews";
import { loginAdminAccount } from "@/lib/admin-auth.functions";

export const Route = createFileRoute("/cont")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { mod?: "creare"; tip?: "admin"; auth?: "neconfigurat" | "eroare" } => ({
    ...(search.mod === "creare" ? { mod: "creare" as const } : {}),
    ...(search.tip === "admin" ? { tip: "admin" as const } : {}),
    ...(search.auth === "neconfigurat" || search.auth === "eroare" ? { auth: search.auth } : {}),
  }),
  component: CustomerAccount,
  head: () => ({
    meta: [
      { title: "Contul meu | Cutiuța Magică" },
      {
        name: "description",
        content: "Contul tău Cutiuța Magică pentru cereri de personalizare și recenzii.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/cont" }],
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

function CustomerAccount() {
  const { tip, auth } = Route.useSearch();
  const queryClient = useQueryClient();
  const loginAdmin = useServerFn(loginAdminAccount);
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
  const providers = useQuery({
    queryKey: ["reviewer-auth-providers"],
    queryFn: () => reviewApi<{ google: { enabled: boolean } }>("/api/v1/reviewer/providers"),
    retry: false,
    staleTime: 60_000,
  });
  const [authSurface, setAuthSurface] = useState<"customer" | "admin">(
    tip === "admin" ? "admin" : "customer",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function authenticateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await loginAdmin({
        data: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
      window.location.assign("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Datele nu au putut fi verificate.");
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await reviewApi("/api/v1/reviewer/logout", { method: "POST" });
      queryClient.setQueryData(["reviewer"], null);
      queryClient.removeQueries({ queryKey: ["personalization-requests"] });
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
        ? "Autentificarea Google nu este încă activată. Te rugăm să revii după configurare."
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
                <small>Comenzi, recomandări și review-uri foto pot aduce beneficii.</small>
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
          <div className="customer-auth-modes">
            <button
              type="button"
              aria-pressed={authSurface === "customer"}
              onClick={() => {
                setAuthSurface("customer");
                setError("");
              }}
            >
              Cont client
            </button>
            <button
              type="button"
              aria-pressed={authSurface === "admin"}
              onClick={() => {
                setAuthSurface("admin");
                setError("");
              }}
            >
              Administrator
            </button>
          </div>
          {authSurface === "customer" ? (
            <div className="customer-oauth-panel">
              <div className="customer-auth-icon" aria-hidden>
                <UserRound />
              </div>
              <p className="customer-auth-kicker">Logare și înregistrare</p>
              <h2 id="customer-auth-title">Un singur pas, cu Google</h2>
              <p>
                Dacă e prima vizită, contul se creează automat. Dacă ai revenit, intri direct în
                poveștile tale.
              </p>
              <a
                className="customer-google-button"
                href={googleReady ? "/api/v1/reviewer/oauth/google" : undefined}
                aria-disabled={!googleReady}
                onClick={(event) => {
                  if (!googleReady) event.preventDefault();
                }}
              >
                <span aria-hidden>G</span>
                {providers.isLoading
                  ? "Verificăm conexiunea…"
                  : googleReady
                    ? "Continuă cu Google"
                    : "Conectare Google în curs de activare"}
                <ArrowRight size={16} />
              </a>
              {customerAuthMessage && (
                <p className="personalization-error" role="alert">
                  {customerAuthMessage}
                </p>
              )}
              <div className="customer-auth-assurance">
                <ShieldCheck aria-hidden />
                <span>
                  Nu îți cerem o parolă nouă. Folosim doar identitatea, numele și adresa confirmată
                  de Google.
                </span>
              </div>
              <p className="customer-auth-legal">
                Continuând, accepți crearea contului și confirmi că ai citit{" "}
                <Link to="/politica-de-confidentialitate">Politica de confidențialitate</Link>.
              </p>
            </div>
          ) : (
            <div className="customer-admin-panel">
              <div className="customer-auth-icon" aria-hidden>
                <KeyRound />
              </div>
              <p className="customer-auth-kicker">Acces administrativ</p>
              <h2 id="customer-auth-title">Intră în administrare</h2>
              <p>Folosește e-mailul și parola contului administrativ.</p>
              <form onSubmit={authenticateAdmin}>
                <label>
                  E-mail
                  <input
                    name="email"
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="username"
                  />
                </label>
                <label>
                  Parolă
                  <input
                    name="password"
                    required
                    type="password"
                    maxLength={128}
                    autoComplete="current-password"
                  />
                </label>
                {error && (
                  <p className="personalization-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="magic-button" disabled={busy}>
                  {busy ? "Se verifică…" : "Intră în administrare"}
                  <ArrowRight size={16} />
                </button>
              </form>
              <Link className="customer-admin-dedicated" to="/auth">
                Deschide pagina dedicată administratorilor
              </Link>
            </div>
          )}
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

      <section className="customer-rewards-card" aria-labelledby="customer-rewards-title">
        <div className="customer-rewards-card__star" aria-hidden>
          <Star />
        </div>
        <div>
          <p className="catalog-eyebrow">Magic Rewards · în pregătire</p>
          <h2 id="customer-rewards-title">Magic Stars ✦</h2>
          <p>
            O comandă, un review cu fotografie sau o recomandare pot deveni câte o stea — simplu,
            după confirmarea momentului.
          </p>
        </div>
        <Link className="magic-button magic-button--outline" to="/magic-rewards">
          Descoperă programul <ArrowRight size={16} />
        </Link>
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
