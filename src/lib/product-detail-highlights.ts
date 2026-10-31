/** Short, factual product highlights for the purchase area. The full source stays in D1. */
export function productDetailHighlights(details: string[]): string[] {
  return [
    ...new Set(
      details
        .map((detail) => {
          const text = detail.trim();
          if (!text) return "";
          if (/nu este jucărie/i.test(text)) {
            const age = text.match(/\b(\d{2})\+/)?.[1];
            return age ? `Pentru colecționari ${age}+` : "Obiect de colecție";
          }
          if (/^dimensiuni(?:\s+aprox\.)?\s*:/i.test(text)) {
            const metric = text
              .split("/")[0]
              .replace(/^dimensiuni(?:\s+aprox\.)?\s*:\s*/i, "")
              .trim();
            return `Format compact · ${metric}`;
          }
          if (/^înălțime cu capacul deschis\s*:/i.test(text)) {
            return `Capac deschis · ${text.split(":").slice(1).join(":").trim()}`;
          }
          if (/^funcționare\s*:/i.test(text) && /manivel/i.test(text)) {
            return "Melodia prinde viață la rotirea manivelei";
          }
          if (/^melodie\s*:/i.test(text)) {
            return `Melodia „${text.split(":").slice(1).join(":").trim()}”`;
          }
          if (/^recomandat\s+\d{2}\+/i.test(text)) {
            return text.replace(/^recomandat\s+/i, "Recomandat de la ").replace("+", " ani");
          }
          if (/^mecanism (?:manual|clasic)(?: cu manivelă)?$/i.test(text)) {
            return "Melodia prinde viață la rotirea manivelei";
          }
          if (/^fotografia modelului disponibil/i.test(text)) return "";
          return text;
        })
        .filter(Boolean),
    ),
  ];
}
