export const CONSENT_STORAGE_KEY = "cutiuta:cookie-consent:v1";
export const CONSENT_EVENT = "cutiuta:consent";
export const CONSENT_OPEN_EVENT = "cutiuta:consent-open";

export type ConsentChoice = {
  necessary: true;
  experience: boolean;
  marketing: boolean;
  savedAt: string;
};
let visitChoice: ConsentChoice | null = null;

export function parseConsent(raw: string | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const choice = JSON.parse(raw) as Partial<ConsentChoice> | null;
    return choice?.necessary === true &&
      typeof choice.experience === "boolean" &&
      typeof choice.marketing === "boolean" &&
      typeof choice.savedAt === "string" &&
      Number.isFinite(Date.parse(choice.savedAt))
      ? (choice as ConsentChoice)
      : null;
  } catch {
    return null;
  }
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    return visitChoice ?? parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return visitChoice;
  }
}

export function analyticsAllowed(): boolean {
  return readConsent()?.experience === true;
}

function clearAnalyticsSession() {
  try {
    const storage = window.sessionStorage;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key === "cm_growth_session_v1" || key?.startsWith("cm_growth_once:"))
        storage.removeItem(key);
    }
  } catch {
    // The current choice still applies when browser storage is unavailable.
  }
}

export function saveConsent(choice: Omit<ConsentChoice, "savedAt">): void {
  if (typeof window === "undefined") return;
  visitChoice = { ...choice, savedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(visitChoice));
  } catch {
    // Keep the explicit choice for this visit without requiring persistent storage.
  }
  if (!choice.experience) clearAnalyticsSession();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

export function subscribeConsent(listener: () => void): () => void {
  const changedElsewhere = (event: StorageEvent) => {
    if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;
    visitChoice = null;
    if (!analyticsAllowed()) clearAnalyticsSession();
    listener();
  };
  window.addEventListener(CONSENT_EVENT, listener);
  window.addEventListener("storage", changedElsewhere);
  return () => {
    window.removeEventListener(CONSENT_EVENT, listener);
    window.removeEventListener("storage", changedElsewhere);
  };
}

export function openConsentSettings(): void {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}
