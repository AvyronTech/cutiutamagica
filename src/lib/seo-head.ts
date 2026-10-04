export const SITE_ORIGIN = "https://cutiutamagica.eu";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_ORIGIN}/scenes/catalog-atelier.webp`;

type SeoHeadOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "product";
  robots?: "index, follow, max-image-preview:large" | "noindex, nofollow";
};

function absoluteUrl(value: string): string {
  return new URL(value, SITE_ORIGIN).href;
}

export function seoHead({
  title,
  description,
  path,
  image = DEFAULT_SOCIAL_IMAGE,
  imageAlt = "Cutiuțe muzicale din lemn, daruri cu melodie și poveste",
  type = "website",
  robots = "index, follow, max-image-preview:large",
}: SeoHeadOptions) {
  const url = absoluteUrl(path);
  const socialImage = absoluteUrl(image);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: type },
      { property: "og:image", content: socialImage },
      { property: "og:image:alt", content: imageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImage },
      { name: "twitter:image:alt", content: imageAlt },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
