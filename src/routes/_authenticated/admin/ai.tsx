import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Bot, ChevronDown, ShieldCheck } from "lucide-react";
import MarketingOrdersAgentControl from "@/admin/pages/MarketingOrdersAgentControl";
import AiContentStudio from "@/admin/pages/AiContentStudio";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: () => (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_95%_5%,rgba(208,170,112,.15),transparent_35%),linear-gradient(135deg,#17233a,#111c2e)] p-5 sm:flex-row sm:items-center sm:justify-between md:p-7">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200/25 bg-amber-200/10 text-amber-200">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-amber-200/75">
              Centru agent
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">
              Agent Codex
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Pregătește lucrări din catalogul real, verifică rezultatele și salvează deciziile.
              Conectările și politica sunt disponibile mai jos.
            </p>
          </div>
        </div>
        <Link
          to="/admin/marketing"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-200/25 bg-amber-100/10 px-4 py-2.5 text-xs font-semibold text-amber-100 hover:bg-amber-100/20"
        >
          <ShieldCheck className="h-4 w-4" /> Aprobări postări
        </Link>
      </header>
      <AiContentStudio />
      <details className="group rounded-2xl border border-white/10 bg-white/[.04] p-4 md:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
          Politica agentului, conectări și aprobări AVYRON{" "}
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-200 transition group-open:rotate-180" />
        </summary>
        <div className="mt-5">
          <MarketingOrdersAgentControl />
        </div>
      </details>
    </div>
  ),
  head: () => ({ meta: [{ title: "Admin · Agent Codex · Cutiuța Magică" }] }),
});
