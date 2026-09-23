import { createElement } from "react";
import { BrandMark } from "@/components/site/BrandMark";
import { toast } from "sonner";
import { playChime, playSparkle } from "@/lib/sound";

/**
 * Notificările storefront-ului: textul și sunetul pleacă împreună,
 * ca fiecare acțiune să aibă același răspuns oriunde e făcută.
 * Sunetul rămâne tăcut dacă vizitatorul nu l-a pornit.
 */

/** `onViewCart` vine de la apelant, ca navigarea să rămână în router (fără reîncărcare). */
export function notifyAddedToCart(productName: string, qty: number, onViewCart?: () => void) {
  if (qty <= 0) {
    toast.info("Ai deja cantitatea maximă pentru această cutiuță în coș.", { duration: 3000 });
    return;
  }
  playChime();
  toast.custom(
    (id) =>
      createElement(
        "div",
        { className: "magic-cart-toast", role: "status" },
        createElement(
          "div",
          { className: "magic-cart-emblem", "aria-hidden": true },
          createElement(BrandMark, { className: "h-16 w-16" }),
        ),
        createElement(
          "div",
          { className: "magic-cart-copy" },
          createElement(
            "p",
            { className: "magic-cart-eyebrow" },
            "Un strop de magie, ales de tine",
          ),
          createElement(
            "strong",
            null,
            qty === 1 ? "Cutiuța ta e în coș." : `${qty} cutiuțe au ajuns în coș.`,
          ),
          createElement("p", null, productName),
          onViewCart &&
            createElement(
              "button",
              {
                type: "button",
                onClick: () => {
                  toast.dismiss(id);
                  onViewCart();
                },
              },
              "Vezi coșul →",
            ),
        ),
        createElement(
          "button",
          {
            type: "button",
            className: "magic-cart-close",
            "aria-label": "Închide notificarea",
            onClick: () => toast.dismiss(id),
          },
          "×",
        ),
        createElement("span", { className: "magic-cart-timer", "aria-hidden": true }),
      ),
    { duration: 5000 },
  );
}

export function notifyFavorite(productName: string, added: boolean) {
  if (added) playSparkle();
  toast(added ? "Păstrată printre favorite" : "Scoasă din favorite", {
    description: productName,
    duration: 2200,
  });
}
