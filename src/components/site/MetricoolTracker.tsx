import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "cutiuta:cookie-consent:v1";
const METRICOOL_SCRIPT_ID = "cutiuta-metricool-tracker";
const METRICOOL_HASH = "dd3885823b08fbd97f71cd91273fc504";

type ConsentChoice = {
  experience?: boolean;
};

declare global {
  interface Window {
    beTracker?: { t: (input: { hash: string }) => void };
    __cutiutaMetricoolPath?: string;
  }
}

function analyticsAllowed(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const choice = JSON.parse(raw) as ConsentChoice;
    return choice.experience === true;
  } catch {
    return false;
  }
}

function track(pathname: string) {
  if (!window.beTracker || window.__cutiutaMetricoolPath === pathname) return;
  window.beTracker.t({ hash: METRICOOL_HASH });
  window.__cutiutaMetricoolPath = pathname;
}

function load(pathname: string) {
  const existing = document.getElementById(METRICOOL_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    track(pathname);
    return;
  }

  const script = document.createElement("script");
  script.id = METRICOOL_SCRIPT_ID;
  script.src = "https://tracker.metricool.com/resources/be.js";
  script.async = true;
  script.onload = () => track(pathname);
  document.head.appendChild(script);
}

export function MetricoolTracker({ pathname }: { pathname: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const update = () => setAllowed(analyticsAllowed());
    update();
    window.addEventListener("cutiuta:consent", update);
    return () => window.removeEventListener("cutiuta:consent", update);
  }, []);

  useEffect(() => {
    if (allowed) load(pathname);
  }, [allowed, pathname]);

  return null;
}
