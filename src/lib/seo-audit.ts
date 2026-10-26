import { giftGuides } from "@/data/gift-guides";
import { productPath } from "@/lib/product-url";
import type { CatalogProduct } from "@/server/db/catalog.repository";

export type SeoFinding = {
  severity: "critical" | "improvement";
  title: string;
  detail: string;
  action: string;
  path?: string;
};

export function auditSeoCatalog(products: CatalogProduct[]) {
  const findings: SeoFinding[] = [];
  const slugs = new Set(products.map((product) => product.slug));
  const titles = new Map<string, string>();

  if (products.length === 0) {
    findings.push({
      severity: "critical",
      title: "Catalogul public este gol",
      detail: "Sitemapul și llms.txt nu pot enumera niciun produs publicat.",
      action: "Verifică produsele publicate, canalul website și conexiunea D1.",
      path: "/produse",
    });
  }

  for (const product of products) {
    const path = productPath(product.slug);
    const add = (severity: SeoFinding["severity"], title: string, detail: string, action: string) =>
      findings.push({ severity, title, detail, action, path });
    if (!product.imageUrl) {
      add(
        "critical",
        `${product.name}: fără fotografie publică`,
        "Pagina și feedul nu au imagine principală aprobată.",
        "Aprobă o fotografie publică în studioul produsului.",
      );
    }
    if (!product.description.trim() && !product.shortDescription.trim()) {
      add(
        "critical",
        `${product.name}: fără descriere`,
        "Pagina nu explică produsul în text.",
        "Completează o descriere factuală a produsului.",
      );
    } else if (!product.description.trim()) {
      add(
        "improvement",
        `${product.name}: descriere detaliată lipsă`,
        "Pagina folosește numai rezumatul scurt al produsului.",
        "Adaugă caracteristicile și utilizarea reale ale modelului.",
      );
    }
    if (!product.seoTitle.trim()) {
      add(
        "improvement",
        `${product.name}: titlu SEO implicit`,
        "Titlul se compune automat din numele produsului.",
        "Scrie un titlu distinct, care descrie exact modelul.",
      );
    } else {
      const key = product.seoTitle.trim().toLocaleLowerCase("ro-RO");
      const previous = titles.get(key);
      if (previous)
        add(
          "improvement",
          `${product.name}: titlu SEO duplicat`,
          `Același titlu ca ${previous}.`,
          "Diferențiază titlul după modelul real.",
        );
      else titles.set(key, product.name);
    }
    if (!product.seoDescription.trim()) {
      add(
        "improvement",
        `${product.name}: descriere SEO implicită`,
        "Descrierea pentru căutare se compune automat.",
        "Scrie un rezumat concret al modelului, fără promisiuni neverificate.",
      );
    }
    if (!product.sku.trim()) {
      add(
        "improvement",
        `${product.name}: fără SKU`,
        "Identificatorul intern lipsește din datele produsului.",
        "Completează SKU-ul real al variantei active.",
      );
    }
    if (product.availability !== "coming_soon" && (product.price == null || product.price <= 0)) {
      add(
        "improvement",
        `${product.name}: preț public lipsă`,
        "Datele structurate nu pot include o ofertă cu preț pentru acest model.",
        "Verifică prețul listei active pentru website.",
      );
    }
  }

  for (const guide of giftGuides) {
    if (!guide.productIds.some((slug) => slugs.has(slug))) {
      findings.push({
        severity: "improvement",
        title: `${guide.label}: fără produse publicate`,
        detail: "Ghidul nu poate trimite cititorul către un produs prezent în catalog.",
        action: "Revizuiește selecția ghidului sau publică numai produse reale potrivite.",
        path: `/cadouri/${guide.slug}`,
      });
    }
  }

  findings.sort((a, b) => Number(b.severity === "critical") - Number(a.severity === "critical"));
  return {
    productCount: products.length,
    guideCount: giftGuides.length,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    improvementCount: findings.filter((finding) => finding.severity === "improvement").length,
    findings,
  };
}
