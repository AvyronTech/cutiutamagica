export const customerAccountSections = [
  { id: "comenzi", label: "Comenzi" },
  { id: "beneficii", label: "Magic Stars" },
  { id: "calendar", label: "Calendar" },
  { id: "portofel", label: "Portofel" },
  { id: "profil", label: "Profil și acces" },
] as const;

export type CustomerAccountSection = (typeof customerAccountSections)[number]["id"] | "cereri";

export function customerAccountSection(hash: string): CustomerAccountSection {
  const section = hash.replace(/^#/, "");
  if (section === "securitatea-contului") return "profil";
  return section === "cereri" || customerAccountSections.some((item) => item.id === section)
    ? (section as CustomerAccountSection)
    : "comenzi";
}

function internalDestination(value: string | undefined): URL | null {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    [...value].some((char) => char === "\\" || char.charCodeAt(0) <= 32)
  )
    return null;
  try {
    const url = new URL(value, "https://cutiutamagica.eu");
    const path = decodeURIComponent(url.pathname);
    if (path.includes("\\") || [...path].some((char) => char.charCodeAt(0) <= 32)) return null;
    return url.origin === "https://cutiutamagica.eu" ? url : null;
  } catch {
    return null;
  }
}

export function isAdminDestination(value: string | undefined): boolean {
  const url = internalDestination(value);
  const path = url ? decodeURIComponent(url.pathname) : undefined;
  return path === "/admin" || !!path?.startsWith("/admin/");
}

export function authDestination(value: string | undefined, role: "client" | "admin"): string {
  const url = internalDestination(value);
  if (!url) return role === "admin" ? "/admin" : "/cont";
  if (role === "admin") return isAdminDestination(value) ? value! : "/admin";
  if (
    isAdminDestination(value) ||
    /^\/(?:auth|api|media|_)(?:\/|$)/.test(decodeURIComponent(url.pathname)) ||
    url.pathname.startsWith("/_")
  )
    return "/cont";
  return `${url.pathname}${url.search}${url.hash}`;
}
