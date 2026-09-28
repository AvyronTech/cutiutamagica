import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Box, CheckCircle2, LogOut, Sparkles, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  formatPersonalizationPrice,
  personalizationMelodies,
  personalizationReference,
  type PersonalizationRequestSummary,
} from "@/lib/personalization";
import { reviewApi, type Reviewer } from "@/lib/reviews";

export const Route = createFileRoute("/cont")({
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await reviewApi<Reviewer>("/api/v1/reviewer/" + mode, {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          displayName: mode === "register" ? form.get("displayName") : undefined,
          consent: mode === "register" ? form.get("consent") === "on" : undefined,
          website: form.get("website"),
        }),
      });
      await account.refetch();
      await queryClient.invalidateQueries({ queryKey: ["personalization-requests"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Autentificarea nu a reușit.");
    } finally {
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
    return (
      <div className="customer-account-page customer-account-page--guest">
        <section className="customer-account-story">
          <p className="catalog-eyebrow">
            <Sparkles size={14} /> Locul poveștilor tale
          </p>
          <h1>Contul tău Cutiuța Magică</h1>
          <p>
            Păstrezi într-un singur loc cererile de personalizare și identitatea folosită pentru
            recenzii. Magazinul și contul de administrator rămân complet separate.
          </p>
          <ul>
            <li>
              <CheckCircle2 /> Vezi stadiul cererilor tale
            </li>
            <li>
              <CheckCircle2 /> Trimiți recenzii fără să repeți datele
            </li>
            <li>
              <CheckCircle2 /> Sesiune securizată, fără parole salvate în browser
            </li>
          </ul>
          <Link className="magic-button magic-button--outline" to="/personalizeaza">
            Personalizează o cutiuță <ArrowRight size={17} />
          </Link>
        </section>

        <section className="customer-auth-card" aria-labelledby="customer-auth-title">
          <div className="customer-auth-modes">
            <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
              Am cont
            </button>
            <button
              type="button"
              aria-pressed={mode === "register"}
              onClick={() => setMode("register")}
            >
              Creează cont
            </button>
          </div>
          <div className="customer-auth-icon" aria-hidden>
            <UserRound />
          </div>
          <h2 id="customer-auth-title">
            {mode === "login" ? "Bine ai revenit" : "Creează-ți contul"}
          </h2>
          <p>
            {mode === "login"
              ? "Intră cu adresa de e-mail și parola ta."
              : "Durează mai puțin de un minut."}
          </p>
          <form onSubmit={authenticate}>
            <label className="customer-auth-trap" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            {mode === "register" && (
              <label>
                Nume afișat
                <input
                  name="displayName"
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              E-mail
              <input name="email" required type="email" maxLength={254} autoComplete="email" />
            </label>
            <label>
              Parolă · minimum 12 caractere
              <input
                name="password"
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
            {mode === "register" && (
              <label className="customer-auth-consent">
                <input name="consent" type="checkbox" required />
                <span>
                  Sunt de acord cu crearea contului și am citit{" "}
                  <Link to="/politica-de-confidentialitate">politica de confidențialitate</Link>.
                </span>
              </label>
            )}
            {error && (
              <p className="personalization-error" role="alert">
                {error}
              </p>
            )}
            <button className="magic-button" disabled={busy || account.isFetching}>
              {busy ? "Se verifică…" : mode === "login" ? "Intră în cont" : "Creează contul"}
              <ArrowRight size={16} />
            </button>
          </form>
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
