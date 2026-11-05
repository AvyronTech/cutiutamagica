/** Local copies of legacy catalog photos whose original R2 objects are unavailable. */
const legacyMediaPhotos: Record<string, string> = {
  media_hp_keeper_hero: "/produse/hp-keeper/card.webp",
  media_halloween_hero: "/produse/halloween/card.webp",
  media_hp_always_hero: "/produse/archive/hp-always.webp",
  media_pirates_hero: "/produse/archive/pirates.webp",
  media_kitten_hero: "/produse/kitten/card.webp",
  media_starwars_dad_hero: "/produse/archive/starwars-dad.webp",
  media_lotr_rings_hero: "/produse/archive/lotr-rings.webp",
  media_fairy_hero: "/produse/archive/fairy.webp",
};

export function productImageFallback(src: string): string | null {
  const mediaId = /^\/media\/([a-zA-Z0-9_-]+)$/.exec(src)?.[1];
  return mediaId ? (legacyMediaPhotos[mediaId] ?? null) : null;
}

export function stableProductImageSource(src: string): string {
  return productImageFallback(src) ?? src;
}
