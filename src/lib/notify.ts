import { createElement } from "react";
import { BrandMark } from "@/components/site/BrandMark";
import { toast } from "sonner";
import { PackageCheck, ShieldCheck } from "lucide-react";
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
    { duration: 3500 },
  );
}

function checkoutHint(
  id: "checkout-delivery" | "checkout-security",
  icon: typeof PackageCheck,
  title: string,
  message: string,
) {
  toast.custom(
    () =>
      createElement(
        "div",
        { className: "checkout-whisper-toast", role: "status" },
        createElement(
          "span",
          { className: "checkout-whisper-icon", "aria-hidden": true },
          createElement(icon, { size: 17 }),
        ),
        createElement(
          "span",
          { className: "checkout-whisper-copy" },
          createElement("strong", null, title),
          createElement("small", null, message),
        ),
      ),
    { id, duration: 4000 },
  );
}

export function notifyCheckoutDelivery() {
  checkoutHint(
    "checkout-delivery",
    PackageCheck,
    "Pregătită cu grijă",
    "Verificăm cutiuța înainte să plece spre tine.",
  );
}

export function notifyCheckoutSecurity() {
  checkoutHint(
    "checkout-security",
    ShieldCheck,
    "Date protejate",
    "Comanda este salvată o singură dată, chiar dacă reîncerci.",
  );
}

export function notifyFavorite(productName: string, added: boolean) {
  if (added) playSparkle();
  toast(added ? "Păstrată printre favorite" : "Scoasă din favorite", {
    description: productName,
    duration: 2200,
  });
}
