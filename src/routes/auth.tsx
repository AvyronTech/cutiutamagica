import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type FormEvent, type PointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { z } from "zod";
import bgPoveste from "@/assets/bg-poveste.jpg";
import {
  loginAdminAccount,
  requestAdminAccess,
  requestAdminRecovery,
} from "@/lib/admin-auth.functions";

const authSearchSchema = z.object({ redirect: z.string().optional() });
type AuthMode = "login" | "access" | "recovery";

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Autentificare administrare · Cutiuța Magică" },
      { name: "description", content: "Acces privat în administrarea Cutiuța Magică." },
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
  return "Operațiunea nu a reușit. Verifică datele și încearcă din nou.";
}

const fieldClass =
  "mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-black/25 px-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#e8c88d]/65 focus:ring-2 focus:ring-[#e8c88d]/15";

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const login = useServerFn(loginAdminAccount);
  const requestAccess = useServerFn(requestAdminAccess);
  const requestRecovery = useServerFn(requestAdminRecovery);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

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
      window.location.assign(safeRedirect(search.redirect));
    } catch (cause) {
      setError(readableError(cause));
      setBusy(false);
    }
  }

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await requestAccess({
        data: {
          email: String(form.get("email")),
          displayName: String(form.get("displayName")),
          reason: String(form.get("reason")),
        },
      });
      setSuccess(result.message);
      formElement.reset();
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await requestRecovery({ data: { email: String(form.get("email")) } });
      setSuccess(result.message);
      formElement.reset();
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? "Intră în administrare"
      : mode === "access"
        ? "Solicită acces staff"
        : "Recuperează accesul";
  const description =
    mode === "login"
      ? "Folosește una dintre adresele autorizate și parola contului."
      : mode === "access"
        ? "Solicitarea ajunge la super administratori. Nu creează automat un cont."
        : "Înregistrăm cererea discret și anunțăm administratorii pentru verificarea identității.";

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#17100c] text-[#fff9ed]">
      <motion.img
        src={bgPoveste}
        alt=""
        aria-hidden="true"
        initial={reducedMotion ? false : { scale: 1.04, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.34 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(20,12,8,.97),rgba(39,23,14,.80)_55%,rgba(20,12,8,.94))]" />
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
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e8c88d]/30 bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[.12em] text-[#f3d9a8] backdrop-blur md:mt-8">
              <Sparkles className="h-3.5 w-3.5" /> Atelierul din culise
            </div>
            <h1 className="mt-5 max-w-lg font-display text-4xl leading-[1.02] sm:text-5xl md:text-6xl">
              Magia din vitrină începe aici.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#f7ead3]/72 md:text-base">
              Produse, comenzi, povești și campanii coordonate într-un spațiu privat, construit
              pentru echipa Cutiuța Magică.
            </p>
            <div className="mt-7 hidden gap-3 sm:grid sm:grid-cols-3 lg:grid">
              {[
                [ShieldCheck, "Conturi aprobate"],
                [LockKeyhole, "Sesiuni protejate"],
                [KeyRound, "Control complet"],
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
            className="rounded-lg border border-white/15 bg-[#20150f]/80 p-5 shadow-2xl backdrop-blur-2xl sm:p-7 md:p-8"
          >
            <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`min-h-10 rounded-md px-3 text-xs font-medium transition ${mode === "login" || mode === "recovery" ? "bg-[#e8c88d] text-[#24150d]" : "text-[#f7ead3]/60 hover:text-white"}`}
              >
                Autentificare
              </button>
              <button
                type="button"
                onClick={() => switchMode("access")}
                className={`min-h-10 rounded-md px-3 text-xs font-medium transition ${mode === "access" ? "bg-[#e8c88d] text-[#24150d]" : "text-[#f7ead3]/60 hover:text-white"}`}
              >
                Solicită acces
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={reducedMotion ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, x: -14 }}
                transition={{ duration: 0.24 }}
              >
                <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-lg border border-[#e8c88d]/30 bg-[#e8c88d]/10">
                  {mode === "access" ? (
                    <UserPlus className="h-5 w-5 text-[#e8c88d]" />
                  ) : mode === "recovery" ? (
                    <Mail className="h-5 w-5 text-[#e8c88d]" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-[#e8c88d]" />
                  )}
                </div>
                <h2 className="mt-4 font-display text-3xl">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#f7ead3]/65">{description}</p>

                {mode === "login" ? (
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
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("recovery")}
                      className="text-xs text-[#e8c88d] underline-offset-4 hover:underline"
                    >
                      Ai uitat parola?
                    </button>
                    <SubmitButton busy={busy} label="Autentificare" />
                  </form>
                ) : mode === "access" ? (
                  <form onSubmit={submitAccess} className="mt-6 space-y-4">
                    <label className="block text-xs font-medium text-[#f7ead3]/80">
                      Nume complet
                      <input
                        name="displayName"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs font-medium text-[#f7ead3]/80">
                      Adresă de e-mail
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-xs font-medium text-[#f7ead3]/80">
                      Motivul accesului
                      <textarea
                        name="reason"
                        required
                        minLength={10}
                        maxLength={1000}
                        className={`${fieldClass} min-h-24 py-3`}
                        placeholder="Rolul și activitățile necesare"
                      />
                    </label>
                    <SubmitButton busy={busy} label="Trimite solicitarea" />
                  </form>
                ) : (
                  <form onSubmit={submitRecovery} className="mt-6 space-y-4">
                    <label className="block text-xs font-medium text-[#f7ead3]/80">
                      Adresă autorizată
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        className={fieldClass}
                      />
                    </label>
                    <SubmitButton busy={busy} label="Solicită recuperarea" />
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="flex min-h-10 items-center gap-2 text-xs text-[#e8c88d] hover:text-white"
                    >
                      <ArrowLeft size={14} /> Înapoi la autentificare
                    </button>
                  </form>
                )}

                {error ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-lg border border-red-300/25 bg-red-950/35 px-3.5 py-3 text-xs leading-5 text-red-100"
                  >
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div
                    role="status"
                    className="mt-4 rounded-lg border border-emerald-300/25 bg-emerald-950/35 px-3.5 py-3 text-xs leading-5 text-emerald-100"
                  >
                    {success}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e8c88d] px-4 py-3 text-sm font-semibold text-[#24150d] transition hover:bg-[#f3d9a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#24150d]/25 border-t-[#24150d]" />{" "}
          Se procesează...
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
