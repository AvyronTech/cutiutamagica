import { toast } from "sonner";
import { playChime, playSparkle, playUnlock } from "@/lib/sound";
import { PRODUCT_BASE_PRICE_BANI, VOLUME_PRICE_BANI } from "@/lib/pricing";

/**
 * Notificările storefront-ului: textul și sunetul pleacă împreună,
 * ca fiecare acțiune să aibă același răspuns oriunde e făcută.
 * Sunetul rămâne tăcut dacă vizitatorul nu l-a pornit.
 */

const lei = (bani: number) => `${bani / 100} lei`;

/** `onViewCart` vine de la apelant, ca navigarea să rămână în router (fără reîncărcare). */
export function notifyAddedToCart(productName: string, qty: number, onViewCart?: () => void) {
  playChime();
  toast.success(qty === 1 ? "Cutiuța e în coș" : `${qty} cutiuțe sunt în coș`, {
    description: productName,
    action: onViewCart ? { label: "Vezi coșul", onClick: onViewCart } : undefined,
  });
}

export function notifyFavorite(productName: string, added: boolean) {
  if (added) playSparkle();
  toast(added ? "Păstrată printre favorite" : "Scoasă din favorite", {
    description: productName,
    duration: 2200,
  });
}

/** Pragul de volum din `pricing.ts` tocmai a fost atins. */
export function notifyVolumePriceUnlocked() {
  playUnlock();
  toast("Prețul a scăzut pentru toate cutiuțele", {
    description: `De acum plătești ${lei(VOLUME_PRICE_BANI)} pe bucată în loc de ${lei(PRODUCT_BASE_PRICE_BANI)}.`,
    duration: 5000,
  });
}
