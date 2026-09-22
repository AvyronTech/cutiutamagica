import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, KeyRound, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import Layout from "@/admin/Layout";
import { changeAdminAccountPassword, logoutAdminAccount } from "@/lib/admin-auth.functions";
import { getMyRole } from "@/lib/admin.functions";

type GateState = "loading" | "change_password" | "ok" | "forbidden";

function readableError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Operațiunea nu a reușit. Încearcă din nou.";
}

function PasswordSetup({ email, onComplete }: { email: string; onComplete: () => void }) {
  const changePassword = useServerFn(changeAdminAccountPassword);
  const logout = useServerFn(logoutAdminAccount);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changePassword({ data: { password, confirmation } });
      onComplete();
    } catch (cause) {
      setError(readableError(cause));
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/auth");
    }
  };

  const checks = [
    [password.length >= 12, "Minimum 12 caractere"],
    [/[a-z]/.test(password) && /[A-Z]/.test(password), "Litere mari și mici"],
    [/\d/.test(password), "Cel puțin o cifră"],
    [password.length > 0 && password === confirmation, "Parolele coincid"],
  ] as const;

  return (
    <main className="min-h-[100svh] bg-[#080f1c] px-4 py-8 text-slate-100 sm:px-6 md:py-12">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
        <section className="rounded-lg border border-cyan-300/15 bg-[linear-gradient(145deg,#101c2f,#0c1525)] p-6 shadow-2xl sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10">
            <ShieldCheck className="h-6 w-6 text-cyan-200" />
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
            Primul acces
          </p>
          <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Personalizează cheia de acces.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
            Contul <span className="font-medium text-slate-200">{email}</span> are acces total.
            Înainte de deschiderea dashboardului, înlocuiește parola inițială cu una cunoscută doar
            de tine.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/30 p-4">
              <KeyRound className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-3 text-sm font-semibold text-white">Parolă individuală</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Nu reutiliza parola pe alte servicii.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/30 p-4">
              <LockKeyhole className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-3 text-sm font-semibold text-white">Sesiune privată</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Conectarea expiră automat după 12 ore.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-700/80 bg-[#101929] p-5 shadow-2xl sm:p-7">
          <h2 className="text-lg font-semibold text-white">Setează parola personală</h2>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-xs font-medium text-slate-300">
              Parolă nouă
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-700 bg-[#09111f] px-3.5 text-base text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
              />
            </label>
            <label className="block text-xs font-medium text-slate-300">
              Confirmă parola
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-700 bg-[#09111f] px-3.5 text-base text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
              />
            </label>

            <div className="grid gap-2 py-1 sm:grid-cols-2 lg:grid-cols-1">
              {checks.map(([valid, label]) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 text-xs ${valid ? "text-emerald-300" : "text-slate-500"}`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${valid ? "border-emerald-400/50 bg-emerald-400/10" : "border-slate-600"}`}
                  >
                    {valid ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-400/20 bg-red-950/30 px-3.5 py-3 text-xs leading-5 text-red-200"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-[#07111f] transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (
                "Se salvează..."
              ) : (
                <>
                  Deschide dashboardul <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 text-xs text-slate-500 transition hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" /> Ieșire din cont
          </button>
        </section>
      </div>
    </main>
  );
}

function AdminGate() {
  const [state, setState] = useState<GateState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let alive = true;
    getMyRole()
      .then((result) => {
        if (!alive) return;
        setEmail(result.email);
        setState(
          result.isAdmin ? (result.mustChangePassword ? "change_password" : "ok") : "forbidden",
        );
      })
      .catch(() => alive && setState("forbidden"));
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div
        className="flex min-h-[100svh] items-center justify-center bg-[#080f1c]"
        aria-label="Se verifică sesiunea"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    );
  }

  if (state === "change_password") {
    return <PasswordSetup email={email} onComplete={() => setState("ok")} />;
  }

  if (state === "forbidden") {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#080f1c] p-6">
        <section className="w-full max-w-md rounded-lg border border-slate-700 bg-[#101929] p-6 text-center text-slate-200 shadow-2xl sm:p-8">
          <LockKeyhole className="mx-auto h-8 w-8 text-cyan-300" />
          <h1 className="mt-4 text-2xl font-semibold">Sesiune indisponibilă</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Autentifică-te cu unul dintre conturile administrative aprobate.
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/admin" }}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-[#07111f] transition hover:bg-cyan-200"
          >
            Mergi la autentificare
          </Link>
        </section>
      </main>
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});
