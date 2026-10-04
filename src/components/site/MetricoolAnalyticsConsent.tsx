import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "cutiuta:analytics-consent-v1";
const METRICOOL_SCRIPT_ID = "cutiuta-metricool-tracker";
const METRICOOL_HASH = "dd3885823b08fbd97f71cd91273fc504";

type AnalyticsConsent = "accepted" | "rejected";

declare global {
  interface Window {
    beTracker?: { t: (input: { hash: string }) => void };
    __cutiutaMetricoolPath?: string;
  }
}

function readConsent(): AnalyticsConsent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

function persistConsent(value: AnalyticsConsent) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    return true;
  } catch {
    // Tracking remains disabled if the preference cannot be stored.
    return false;
  }
}

function trackMetricool(pathname: string) {
  if (!window.beTracker || window.__cutiutaMetricoolPath === pathname) return;
  window.beTracker.t({ hash: METRICOOL_HASH });
  window.__cutiutaMetricoolPath = pathname;
}

function loadMetricool(pathname: string) {
  const existing = document.getElementById(METRICOOL_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    trackMetricool(pathname);
    return;
  }

  const script = document.createElement("script");
  script.id = METRICOOL_SCRIPT_ID;
  script.src = "https://tracker.metricool.com/resources/be.js";
  script.async = true;
  script.onload = () => trackMetricool(pathname);
  document.head.appendChild(script);
}

export function MetricoolAnalyticsConsent({ pathname }: { pathname: string }) {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
  }, []);

  useEffect(() => {
    if (consent === "accepted") loadMetricool(pathname);
  }, [consent, pathname]);

  if (!ready) return null;

  const choose = (next: AnalyticsConsent) => {
    const mustStopActiveTracker = consent === "accepted" && next === "rejected";
    const stored = persistConsent(next);
    if (!stored && next === "accepted") return;
    setConsent(next);
    setShowPreferences(false);
    if (mustStopActiveTracker) window.location.reload();
  };

  if (consent && !showPreferences) {
    return (
      <button
        type="button"
        onClick={() => setShowPreferences(true)}
        className="fixed bottom-3 left-3 z-[80] rounded-full border border-[color:var(--gold)]/30 bg-[oklch(0.18_0.03_40/0.92)] px-3 py-2 text-[11px] font-medium text-[oklch(0.92_0.04_80)] shadow-lg backdrop-blur-md transition hover:border-[color:var(--gold)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] sm:bottom-4 sm:left-4"
        aria-label="Deschide preferințele pentru analiza traficului"
      >
        Preferințe cookie
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl rounded-2xl border border-[color:var(--gold)]/35 bg-[oklch(0.16_0.025_40/0.97)] p-4 text-[oklch(0.96_0.02_80)] shadow-[0_24px_70px_-24px_oklch(0.05_0.02_40/0.95)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 id="analytics-consent-title" className="font-display text-lg text-white">
            Magia rămâne și cu măsurători opționale
          </h2>
          <p className="mt-1 text-sm leading-6 text-[oklch(0.9_0.025_80/0.78)]">
            Cu acordul tău, folosim Metricool pentru statistici agregate despre vizite și pentru a
            îmbunătăți magazinul. Fără acord, magazinul funcționează normal și scriptul nu este
            încărcat. Poți schimba alegerea oricând. Detalii în{" "}
            <Link to="/politica-de-confidentialitate" className="underline underline-offset-4">
              politica de confidențialitate
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="min-h-11 rounded-full border border-white/20 px-4 py-2 text-sm font-medium transition hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Doar necesare
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="min-h-11 rounded-full bg-[linear-gradient(135deg,oklch(0.92_0.09_85),oklch(0.78_0.14_62))] px-5 py-2 text-sm font-semibold text-[oklch(0.22_0.04_40)] shadow-md transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Accept analiza
          </button>
        </div>
      </div>
    </section>
  );
}
