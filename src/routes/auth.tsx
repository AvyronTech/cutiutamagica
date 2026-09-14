import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { z } from "zod";
import bgPoveste from "@/assets/bg-poveste.jpg";

const authSearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Acces securizat · Cutiuța Magică" },
      { name: "description", content: "Acces securizat la contul Cutiuța Magică." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function safeRedirect(value?: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const [busy, setBusy] = useState(false);

  const continueWithCloudflare = () => {
    setBusy(true);
    window.location.assign(safeRedirect(search.redirect));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#17100c] text-[#fff9ed]">
      <img
        src={bgPoveste}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(20,12,8,.96),rgba(39,23,14,.82)_52%,rgba(20,12,8,.9))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 md:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-xl">
            <Link to="/" className="text-xs font-medium text-[#e8c88d] transition hover:text-white">
              Înapoi la magazin
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#e8c88d]/30 bg-black/20 px-3 py-1.5 text-[11px] uppercase text-[#f3d9a8] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Cutiuța Magică
            </div>
            <h1 className="mt-5 font-display text-5xl leading-none md:text-6xl">
              Un loc sigur pentru povestea ta.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#f7ead3]/72 md:text-base">
              Accesul este protejat de Cloudflare. Nu trimitem parola către magazin și nu stocăm
              parole în baza de date comercială.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [ShieldCheck, "Identitate verificată"],
                [LockKeyhole, "Sesiune protejată"],
                [KeyRound, "MFA pentru staff"],
              ].map(([Icon, label]) => (
                <div
                  key={label as string}
                  className="flex items-center gap-2 text-xs text-[#f7ead3]/75"
                >
                  <Icon className="h-4 w-4 text-[#e8c88d]" /> {label as string}
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-lg border border-white/12 bg-[#20150f]/88 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#e8c88d]/30 bg-[#e8c88d]/10">
              <ShieldCheck className="h-6 w-6 text-[#e8c88d]" />
            </div>
            <h2 className="mt-6 font-display text-3xl">Intră în cont</h2>
            <p className="mt-2 text-sm leading-6 text-[#f7ead3]/65">
              Continuă cu metoda aprobată în Cloudflare Access. Pentru personal, contul trebuie să
              fie și în lista de acces a magazinului.
            </p>
            <button
              type="button"
              onClick={continueWithCloudflare}
              disabled={busy}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#e8c88d] px-4 py-3 text-sm font-semibold text-[#24150d] transition hover:bg-[#f3d9a8] disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#24150d]/25 border-t-[#24150d]" />{" "}
                  Se deschide accesul...
                </>
              ) : (
                <>
                  Continuă securizat <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-4 text-center text-[11px] leading-5 text-[#f7ead3]/45">
              La prima autentificare, Cloudflare poate cere verificarea adresei și activarea
              autentificării în doi pași.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
