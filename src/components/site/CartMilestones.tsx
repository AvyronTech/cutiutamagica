import { useEffect, useRef } from "react";
import { useShop } from "@/store/shop";
import { getVolumeUnitPriceBani } from "@/lib/pricing";
import { notifyVolumePriceUnlocked } from "@/lib/notify";

/**
 * Ascultă coșul și anunță o singură dată momentul în care se activează prețul
 * de volum. Regula vine din `getVolumeUnitPriceBani`, deci dacă pragul se
 * schimbă în `pricing.ts`, notificarea îl urmează fără altă modificare.
 *
 * Ignoră saltul de la hidratare (coșul citit din localStorage la încărcare):
 * doar o schimbare făcută de vizitator în această vizită declanșează mesajul.
 */
export function CartMilestones() {
  const { totalQty } = useShop();
  const prevRef = useRef<number | null>(null);
  const armedAtRef = useRef(0);

  useEffect(() => {
    armedAtRef.current = performance.now() + 1200;
  }, []);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = totalQty;
    if (prev === null || performance.now() < armedAtRef.current) return;

    const before = getVolumeUnitPriceBani(prev);
    const after = getVolumeUnitPriceBani(totalQty);
    if (before === null && after !== null) notifyVolumePriceUnlocked();
  }, [totalQty]);

  return null;
}
