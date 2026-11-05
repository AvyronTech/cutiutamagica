/** Normalize legacy Romanian cedilla glyphs only at the presentation boundary. */
export function normalizeRomanianDisplayText(value: string): string {
  return value
    .normalize("NFC")
    .replaceAll("Ş", "Ș")
    .replaceAll("ş", "ș")
    .replaceAll("Ţ", "Ț")
    .replaceAll("ţ", "ț");
}
