import { toast } from "sonner";
import { playChime, playSparkle } from "@/lib/sound";

/**
 * Notificările storefront-ului: textul și sunetul pleacă împreună,
 * ca fiecare acțiune să aibă același răspuns oriunde e făcută.
 * Sunetul rămâne tăcut dacă vizitatorul nu l-a pornit.
 */

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
