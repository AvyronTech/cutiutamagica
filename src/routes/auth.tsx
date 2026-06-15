import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles } from "lucide-react";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Autentificare · Cutiuța Magică" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: search.redirect ?? "/", replace: true } as never);
    });
  }, []);

  const onGoogle = async () => {
    try {
      setBusy(true);
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + (search.redirect ?? "/"),
      });
    } catch {
      toast.error("Nu am putut iniția autentificarea Google.");
      setBusy(false);
    }
  };

  const onForgot = async () => {
    if (!email) {
      toast.error("Introdu emailul mai întâi.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) toast.error(error.message);
    else toast.success("Email trimis. Verifică inboxul.");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email },
          },
        });
        if (error) throw error;
        toast.success("Cont creat. Verifică emailul pentru confirmare.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bine ai revenit!");
        navigate({ to: search.redirect ?? "/", replace: true } as never);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare la autentificare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0816] text-slate-100">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.3em] text-violet-300/70 transition hover:text-violet-200"
            >
              ← Înapoi acasă
            </Link>
            <div className="mt-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-violet-200/80 backdrop-blur">
                <Sparkles className="h-3 w-3" /> Cutiuța Magică
              </span>
            </div>
            <h1
              className="mt-4 text-4xl text-white"
              style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 500 }}
            >
              {mode === "signin" ? "Bine ai revenit" : "Creează un cont"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "signin"
                ? "Continuă acolo unde ai rămas."
                : "Cont nou pentru istoric, favorite și panou."}
            </p>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_-20px_rgba(124,58,237,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent" />

            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-slate-100 transition hover:bg-white/[0.07] disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.96l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continuă cu Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              <div className="h-px flex-1 bg-white/10" /> sau <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={onSubmit} className="relative space-y-3">
              {mode === "signup" && (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nume complet"
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-violet-400/60 focus:bg-white/[0.06] focus:outline-none"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-violet-400/60 focus:bg-white/[0.06] focus:outline-none"
              />
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolă"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-violet-400/60 focus:bg-white/[0.06] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-200"
                  aria-label={showPwd ? "Ascunde parola" : "Arată parola"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onForgot}
                    className="text-[11px] text-slate-400 transition hover:text-violet-300"
                  >
                    Ai uitat parola?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-[length:200%_100%] py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/40 transition hover:bg-[position:100%_0] disabled:opacity-50"
              >
                {busy ? "Se procesează..." : mode === "signin" ? "Conectează-te" : "Creează contul"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="relative mt-5 w-full text-xs text-slate-400 transition hover:text-slate-200"
            >
              {mode === "signin" ? "Nu ai cont? Creează unul" : "Ai deja cont? Conectează-te"}
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-500">
            Prin continuare accepți{" "}
            <Link to="/" className="text-violet-300/80 hover:text-violet-200">termenii</Link>{" "}
            și{" "}
            <Link to="/" className="text-violet-300/80 hover:text-violet-200">politica de confidențialitate</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
