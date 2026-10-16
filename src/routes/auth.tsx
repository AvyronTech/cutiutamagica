import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, useReducedMotion } from "framer-motion";
import { useState, type FormEvent, type PointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Mail,
  Gift,
  CalendarDays,
} from "lucide-react";
import { z } from "zod";
import { loginAdminAccount } from "@/lib/admin-auth.functions";
import { reviewApi, type Reviewer } from "@/lib/reviews";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
  role: z.enum(["client", "admin"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Intră în cont · Cutiuța Magică" },
      {
        name: "description",
        content: "Acces în contul Cutiuța Magică pentru clienți și echipa magazinului.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function safeRedirect(value?: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.message && error.message !== "Failed to fetch")
    return error.message;
  return "Autentificarea nu a reușit. Verifică e-mailul și parola.";
}

const fieldClass =
  "mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-black/25 px-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#e8c88d]/65 focus:ring-2 focus:ring-[#e8c88d]/15";

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const customerMode = search.role === "client" || (!search.redirect && search.role !== "admin");
  if (customerMode) return <CustomerAuth />;
  return <AdminAuth redirect={search.redirect} />;
}

function AdminAuth({ redirect }: { redirect?: string }) {
  const login = useServerFn(loginAdminAccount);
  const reducedMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function tiltCard(event: PointerEvent<HTMLElement>) {
    if (reducedMotion || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - rect.top) / rect.height - 0.5) * -3.5,
      y: ((event.clientX - rect.left) / rect.width - 0.5) * 4.5,
    });
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await login({
        data: { email: String(form.get("email")), password: String(form.get("password")) },
      });
      window.location.assign(safeRedirect(redirect));
    } catch (cause) {
      setError(readableError(cause));
      setBusy(false);
    }
  }

  return (
    <main className="admin-login relative min-h-[100svh] overflow-hidden bg-[#17100c] text-[#fff9ed]">
      <motion.img
        src="/scenes/music-box-world.webp"
        alt=""
        aria-hidden="true"
        initial={reducedMotion ? false : { scale: 1.04, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.92 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="admin-login__shade absolute inset-0" />
      <motion.div
        aria-hidden="true"
        animate={reducedMotion ? undefined : { y: [0, -12, 0], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[8%] top-[12%] h-48 w-48 rounded-full bg-[#e8c88d]/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-6xl items-center px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-14">
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, x: -22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65 }}
            className="max-w-xl"
          >
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-[#e8c88d] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c88d]"
            >
              <ArrowLeft size={14} /> Înapoi la magazin
            </Link>
            <div className="mt-5 flex w-fit items-center gap-2 rounded-full border border-[#e8c88d]/30 bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[.12em] text-[#f3d9a8] backdrop-blur md:mt-8">
              <Sparkles className="h-3.5 w-3.5" /> Atelierul din culise
            </div>
            <h1 className="mt-5 max-w-lg font-display text-4xl leading-[1.02] sm:text-5xl md:text-6xl">
              Magia din vitrină începe aici.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#f7ead3]/72 md:text-base">
              Acces securizat la produsele, comenzile și operațiunile magazinului Cutiuța Magică.
            </p>
            <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3 lg:grid">
              {[
                [ShieldCheck, "Acces verificat"],
                [LockKeyhole, "Sesiuni protejate"],
                [KeyRound, "E-mail și parolă"],
              ].map(([Icon, label]) => (
                <div
                  key={String(label)}
                  className="rounded-lg border border-white/10 bg-black/15 p-3 text-xs text-[#f7ead3]/75 backdrop-blur"
                >
                  <Icon className="mb-2 h-4 w-4 text-[#e8c88d]" />
                  {String(label)}
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            onPointerMove={tiltCard}
            onPointerLeave={() => setTilt({ x: 0, y: 0 })}
            animate={{ rotateX: tilt.x, rotateY: tilt.y }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            style={{ transformPerspective: 1000, transformStyle: "preserve-3d" }}
            className="rounded-2xl border border-white/15 bg-[#20150f]/85 p-5 shadow-2xl backdrop-blur-2xl sm:p-7 md:p-8"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#e8c88d]/30 bg-[#e8c88d]/10">
              <ShieldCheck className="h-5 w-5 text-[#e8c88d]" />
            </div>
            <div className="mt-4 flex gap-2 text-xs">
              <Link
                to="/auth"
                search={{ role: "client" }}
                className="rounded-full border border-white/15 px-3 py-2 text-[#f7ead3]/70 hover:text-white"
              >
                Cont client
              </Link>
              <span className="rounded-full border border-[#e8c88d]/50 bg-[#e8c88d]/15 px-3 py-2 text-[#f3d9a8]">
                Echipă
              </span>
            </div>
            <h2 className="mt-4 font-display text-3xl">Intră în administrare</h2>
            <p className="mt-2 text-sm leading-6 text-[#f7ead3]/65">
              Folosește adresa de e-mail și parola contului administrativ.
            </p>

            <form onSubmit={submitLogin} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-[#f7ead3]/80">
                Adresă de e-mail
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  maxLength={254}
                  className={fieldClass}
                  placeholder="nume@domeniu.ro"
                />
              </label>
              <label className="block text-xs font-medium text-[#f7ead3]/80">
                Parolă
                <span className="relative mt-2 block">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    className={`${fieldClass} mt-0 pr-12`}
                    placeholder="Parola contului"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#f7ead3]/55 hover:text-white"
                    aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <SubmitButton busy={busy} />
            </form>

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-300/25 bg-red-950/35 px-3.5 py-3 text-xs leading-5 text-red-100"
              >
                {error}
              </div>
            ) : null}
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function CustomerAuth() {
  const providers = useQuery({
    queryKey: ["reviewer-auth-providers"],
    queryFn: () =>
      reviewApi<{ google: { enabled: boolean }; email: { enabled: boolean } }>(
        "/api/v1/reviewer/providers",
      ),
    retry: false,
  });
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await reviewApi<{ challengeId: string }>("/api/v1/reviewer/email/start", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setChallengeId(result.challengeId);
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await reviewApi<Reviewer>("/api/v1/reviewer/email/verify", {
        method: "POST",
        body: JSON.stringify({ email, challengeId, code }),
      });
      window.location.assign("/cont");
    } catch (cause) {
      setError(readableError(cause));
      setBusy(false);
    }
  }

  return (
    <main className="customer-login">
      <img
        className="customer-login__scene"
        src="/scenes/music-box-world.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="customer-login__shade" aria-hidden="true" />
      <div className="customer-login__layout">
        <section className="customer-login__story">
          <Link className="customer-login__back" to="/">
            <ArrowLeft size={16} /> Înapoi la magazin
          </Link>
          <span className="customer-login__eyebrow">
            <Sparkles size={15} /> Contul Cutiuța Magică
          </span>
          <h1>
            Toate poveștile tale, <em>într-un singur loc.</em>
          </h1>
          <p>Urmărești comenzile, păstrezi momentele importante și vezi fiecare stea câștigată.</p>
          <div className="customer-login__benefits">
            <span>
              <Gift size={18} /> Comenzi și cadouri
            </span>
            <span>
              <CalendarDays size={18} /> Calendar personal
            </span>
            <span>
              <Sparkles size={18} /> Magic Rewards
            </span>
          </div>
        </section>
        <section className="customer-login__card" aria-labelledby="customer-login-title">
          <div className="customer-login__tabs">
            <span aria-current="page">Cont client</span>
            <Link to="/auth" search={{ role: "admin", redirect: "/admin" }}>
              Echipă
            </Link>
          </div>
          <div className="customer-login__icon">
            <Mail size={23} />
          </div>
          <p className="customer-login__kicker">Bine ai revenit</p>
          <h2 id="customer-login-title">
            {challengeId ? "Verifică-ți e-mailul" : "Intră în povestea ta"}
          </h2>
          <p className="customer-login__intro">
            {challengeId
              ? `Am trimis un cod de 8 cifre la ${email}. Este valabil 10 minute.`
              : "Primești un cod de acces pe e-mail. La prima vizită, contul se creează automat."}
          </p>
          {challengeId ? (
            <form onSubmit={(event) => void verifyCode(event)} className="customer-login__form">
              <label htmlFor="customer-login-code">Codul de acces</label>
              <input
                id="customer-login-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                maxLength={8}
                required
                placeholder="00000000"
                autoFocus
              />
              <button disabled={busy || code.length !== 8}>
                {busy ? "Se verifică…" : "Deschide contul"} <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="customer-login__text-button"
                onClick={() => {
                  setChallengeId("");
                  setCode("");
                  setError("");
                }}
              >
                Schimbă adresa de e-mail
              </button>
            </form>
          ) : (
            <form onSubmit={(event) => void requestCode(event)} className="customer-login__form">
              <label htmlFor="customer-login-email">Adresa ta de e-mail</label>
              <input
                id="customer-login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                required
                placeholder="nume@exemplu.ro"
              />
              <button
                disabled={busy || providers.isLoading || providers.data?.email.enabled === false}
              >
                {busy ? "Se trimite…" : "Trimite codul de acces"} <ArrowRight size={17} />
              </button>
            </form>
          )}
          {error && (
            <p className="customer-login__error" role="alert">
              {error}
            </p>
          )}
          {providers.data?.google.enabled && (
            <div className="customer-login__alternate">
              <span>sau</span>
              <a href="/api/v1/reviewer/oauth/google">
                Continuă cu Google <ArrowRight size={16} />
              </a>
            </div>
          )}
          {providers.data?.email.enabled === false && !providers.data.google.enabled && (
            <p className="customer-login__error" role="status">
              Accesul prin e-mail este în configurare. Poți continua cumpărăturile fără cont.
            </p>
          )}
          <p className="customer-login__privacy">
            Continuând, confirmi că ai citit{" "}
            <Link to="/politica-de-confidentialitate">Politica de confidențialitate</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}

function SubmitButton({ busy }: { busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e8c88d] px-4 py-3 text-sm font-semibold text-[#24150d] transition hover:bg-[#f3d9a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#24150d]/25 border-t-[#24150d]" />{" "}
          Se autentifică...
        </>
      ) : (
        <>
          Autentificare
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
