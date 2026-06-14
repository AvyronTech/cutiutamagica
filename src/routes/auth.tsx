import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";
import { toast } from "sonner";

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
    } catch (e) {
      toast.error("Nu am putut iniția autentificarea Google.");
      setBusy(false);
    }
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
      const msg = err instanceof Error ? err.message : "Eroare la autentificare";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-xs uppercase tracking-[0.3em] text-purple-300/70 hover:text-purple-200">
            ← Înapoi acasă
          </Link>
          <h1 className="font-display text-3xl mt-3 text-white">
            {mode === "signin" ? "Bine ai revenit" : "Creează un cont"}
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {mode === "signin"
              ? "Conectează-te pentru a accesa panoul."
              : "Cont nou pentru istoric și administrare."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#334155] bg-[#1E293B]/60 backdrop-blur p-6 shadow-xl">
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-[#334155] bg-[#0F172A] hover:bg-[#0F172A]/80 text-slate-100 py-2.5 text-sm transition disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.96l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continuă cu Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500">
            <div className="h-px flex-1 bg-[#334155]" /> sau <div className="h-px flex-1 bg-[#334155]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nume complet"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolă"
              className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              {busy ? "Se procesează..." : mode === "signin" ? "Conectează-te" : "Creează contul"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-xs text-slate-400 hover:text-slate-200"
          >
            {mode === "signin" ? "Nu ai cont? Creează unul" : "Ai deja cont? Conectează-te"}
          </button>
        </div>
      </div>
    </div>
  );
}
