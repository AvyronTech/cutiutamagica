import { isValidGtin } from "./gtin";

const GENERIC_CATEGORIES =
  /^(?:cadouri?|produse?|cutiut[ae]|music|muzical[ae]|special[ae]|altele?)(?:\s|$)/i;

function asciiWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(
      (word) => word && !["CU", "DE", "DIN", "SI", "THE", "O", "UN", "O", "A"].includes(word),
    );
}

/** Stable, readable prefix; the database allocates the next number atomically. */
export function skuPrefix(category: string, productName: string): string {
  const source =
    !category.trim() || GENERIC_CATEGORIES.test(category.trim()) ? productName : category;
  const words = asciiWords(source);
  if (words.length >= 2)
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .padEnd(2, "X");
  return (words[0] || "PROD").slice(0, 4).padEnd(2, "X");
}

export function formatSku(prefix: string, sequenceNumber: number): string {
  return `CM-${prefix}-${String(sequenceNumber).padStart(3, "0")}`;
}

export function gtinType(value: string): "GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14" | null {
  if (!isValidGtin(value)) return null;
  return `GTIN-${value.length}` as "GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14";
}

export function safePublicDestination(siteUrl: string, pathname: string): string | null {
  try {
    const base = new URL(siteUrl);
    const target = new URL(pathname, base);
    const localPreview =
      base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname);
    if ((base.protocol !== "https:" && !localPreview) || target.origin !== base.origin) return null;
    if (/^\/(?:admin|api|auth|cont)(?:\/|$)/.test(target.pathname)) return null;
    return target.toString();
  } catch {
    return null;
  }
}

export function escapeCsv(value: unknown): string {
  const string = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(string) ? `'${string}` : string;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}
