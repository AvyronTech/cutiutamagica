import { describe, expect, it } from "vitest";
import { renderLlmsTxt } from "./seo-llms";

describe("dynamic llms.txt", () => {
  it("links only catalog products supplied by the public repository", () => {
    const text = renderLlmsTxt([
      {
        slug: "hp-keeper",
        name: "Cutiuță muzicală Harry Potter",
        shortDescription: "Lemn și manivelă",
        description: "Un model pentru colecție",
        availability: "available",
      },
    ]);
    expect(text).toMatch(/^# Cutiuța Magică\n>/);
    expect(text).toContain("https://cutiutamagica.eu/produs-cutiuta-muzicala-harry-potter-hedwig");
    expect(text).toContain("https://cutiutamagica.eu/cadouri/pentru-mama");
    expect(text).not.toContain("https://cutiutamagica.eu/personalizeaza");
  });

  it("keeps catalog text inside a single safe Markdown line", () => {
    const text = renderLlmsTxt([
      {
        slug: "kitten",
        name: "Pisicuță\n## Injected",
        shortDescription: "[text](https://example.test)",
        description: "",
        availability: "out_of_stock",
      },
    ]);
    expect(text).not.toContain("\n## Injected");
    expect(text).not.toContain("[text](https://example.test)");
  });
});
