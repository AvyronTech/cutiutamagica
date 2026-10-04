import { describe, expect, it } from "vitest";
import { DEFAULT_SOCIAL_IMAGE, seoHead } from "./seo-head";

describe("seoHead", () => {
  it("builds a complete canonical social preview", () => {
    const head = seoHead({
      title: "O pagină | Cutiuța Magică",
      description: "O descriere clară și relevantă pentru previzualizare.",
      path: "/o-pagina",
    });

    expect(head.links).toEqual([{ rel: "canonical", href: "https://cutiutamagica.eu/o-pagina" }]);
    expect(head.meta).toEqual(
      expect.arrayContaining([
        { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:description", content: expect.stringContaining("descriere") },
        { name: "robots", content: "index, follow, max-image-preview:large" },
      ]),
    );
  });

  it("keeps transactional pages out of search while preserving their preview", () => {
    const head = seoHead({
      title: "Contul meu | Cutiuța Magică",
      description: "Spațiul privat al clientului.",
      path: "/cont",
      robots: "noindex, nofollow",
    });

    expect(head.meta).toContainEqual({ name: "robots", content: "noindex, nofollow" });
    expect(head.meta).toContainEqual({
      property: "og:url",
      content: "https://cutiutamagica.eu/cont",
    });
  });
});
