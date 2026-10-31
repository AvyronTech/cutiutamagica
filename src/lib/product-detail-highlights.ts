const storyHighlightByProduct: Record<string, string> = {
  "hp-keeper": "Un strop de Hogwarts pentru raftul cu povești",
  "got-winter": "Un semn din Nord pentru fanii legendelor",
  kitten: "Un dar tandru pentru iubitorii de pisici",
  halloween: "Farmec de Halloween într-o cutiuță",
  sunshine: "O rază de bucurie pentru cineva drag",
  "lotr-rings": "Pentru aventuri în Pământul de Mijloc",
  "hp-always": "O poveste despre promisiuni care rămân",
  fairy: "Un colț de basm pentru iubitorii naturii",
  pirates: "O aventură pe mare, în câteva note",
  "starwars-dad": "Un univers de amintiri pentru tata",
};

/** Short, factual product highlights for the purchase area. The full source stays in D1. */
export function productDetailHighlights(details: string[], productId: string): string[] {
  const storyHighlight = storyHighlightByProduct[productId] ?? "Un mic dar cu poveste";
  return [
    ...new Set(
      details
        .map((detail) => {
          const text = detail.trim();
          if (!text) return "";
          if (/nu este jucărie|^recomandat\s+\d{2}\+/i.test(text)) {
            return storyHighlight;
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
