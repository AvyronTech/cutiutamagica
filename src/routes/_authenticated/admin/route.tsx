import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import Layout from "@/admin/Layout";
import { completeAdminOnboarding, getMyRole } from "@/lib/admin.functions";

function AdminGate() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "onboarding" | "ok" | "forbidden">("loading");

  useEffect(() => {
    let alive = true;
    getMyRole()
      .then((r) => {
        if (!alive) return;
        setState(
          r.isAdmin ? (r.onboardingStatus === "complete" ? "ok" : "onboarding") : "forbidden",
        );
      })
      .catch(() => alive && setState("forbidden"));
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === "onboarding") {
    return (
      <div className="min-h-screen bg-[#0b1120] p-5 text-slate-100 md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-cyan-400/20 bg-[#111c2e] p-5 shadow-2xl md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10">
              <ShieldCheck className="h-6 w-6 text-cyan-300" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase text-cyan-300">Primul acces</p>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              Configurare rapidă super-admin
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Magazinul nu stochează parola. Schimbarea parolei și autentificarea în doi pași sunt
              administrate de furnizorul de identitate conectat la Cloudflare Access.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                [KeyRound, "Identitate", "Folosește un cont individual, fără parolă comună."],
                [
                  ShieldCheck,
                  "MFA",
                  "Politica Access trebuie să solicite autentificare în doi pași.",
                ],
                [Smartphone, "Dispozitiv", "Instalează PWA numai pe un telefon protejat."],
              ].map(([Icon, title, copy]) => (
                <div
                  key={title as string}
                  className="rounded-lg border border-[#28364d] bg-[#0b1526] p-4"
                >
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <h2 className="mt-3 text-sm font-semibold text-white">{title as string}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{copy as string}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                await completeAdminOnboarding();
                setState("ok");
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#07111f] transition hover:bg-cyan-200 md:w-auto"
            >
              Am verificat securitatea <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
        <div className="max-w-md text-center text-slate-200">
          <h1 className="text-2xl font-semibold mb-2">Acces restricționat</h1>
          <p className="text-slate-400 text-sm mb-6">
            Contul tău nu are permisiuni de administrator.
          </p>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
          >
            Înapoi la site
          </button>
        </div>
      </div>
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
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
});
