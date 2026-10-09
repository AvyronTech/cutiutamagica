export const PRODUCT_ROUTE_PATTERN = "/produs-cutiuta-muzicala-{$slug}" as const;
export const PRODUCT_PATH_PREFIX = "/produs-cutiuta-muzicala-" as const;
export const LEGACY_PRODUCT_PATH_PREFIX = "/produs/" as const;

/**
 * Public, descriptive slugs are deliberately separate from the stable D1 product slugs.
 * This keeps orders, reviews, stock and media references intact while allowing SEO URLs to evolve.
 */
const publicSlugs: Readonly<Record<string, string>> = {
  fairy: "zana-padurii-fermecate",
  "got-winter": "winter-is-coming",
  halloween: "halloween",
  "hp-always": "i-solemnly-swear",
  "hp-keeper": "harry-potter-hedwig",
  kitten: "pisicuta-si-luna",
  "lotr-rings": "one-ring",
  pirates: "piratii-din-caraibe",
  "starwars-dad": "best-dad-galaxy",
  sunshine: "you-are-sunshine",
};

const productIds = new Map(Object.entries(publicSlugs).map(([id, slug]) => [slug, id]));
const knownProductIds = new Set(Object.keys(publicSlugs));

const normalizeSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .join("-");

export function productPublicSlug(productId: string): string {
  return publicSlugs[productId] ?? normalizeSlug(productId);
}

export function productIdFromPublicSlug(publicSlug: string): string {
  return productIds.get(publicSlug) ?? publicSlug;
}

export function productPath(productId: string): `/produs-cutiuta-muzicala-${string}` {
  return `${PRODUCT_PATH_PREFIX}${encodeURIComponent(productPublicSlug(productId))}`;
}

export function isKnownProductId(productId: string): boolean {
  return knownProductIds.has(productId);
}

export function productLink(productId: string) {
  return {
    to: PRODUCT_ROUTE_PATTERN,
    params: { slug: productPublicSlug(productId) },
  } as const;
}

export function productIdFromPathname(pathname: string): string | undefined {
  if (pathname.startsWith(PRODUCT_PATH_PREFIX)) {
    const publicSlug = decodeURIComponent(pathname.slice(PRODUCT_PATH_PREFIX.length));
    return productIdFromPublicSlug(publicSlug);
  }
  if (pathname.startsWith(LEGACY_PRODUCT_PATH_PREFIX)) {
    return decodeURIComponent(pathname.slice(LEGACY_PRODUCT_PATH_PREFIX.length));
  }
  return undefined;
}

export function isProductPath(pathname: string): boolean {
  return productIdFromPathname(pathname) !== undefined;
}

export const productPublicSlugEntries = Object.entries(publicSlugs);
