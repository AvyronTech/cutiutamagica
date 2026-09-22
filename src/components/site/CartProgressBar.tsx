import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useShop } from "@/store/shop";
import {
  PRODUCT_BASE_PRICE_BANI,
  VOLUME_PRICE_BANI,
  calculateDisplayedTotals,
  getVolumeUnitPriceBani,
} from "@/lib/pricing";

/**
 * Bara de progres spre prețul de volum.
 *
 * Apare doar după ce vizitatorul are cel puțin o cutiuță în coș — strip-ul de pe
 * homepage acoperă deja promisiunea statică, aici e doar progresul viu. E fixată
 * jos, deci apariția ei nu mută conținutul paginii (zero layout shift), și îl
 * urmează pe vizitator pe tot magazinul. Se poate închide pentru sesiunea curentă.
 *
 * Toate cifrele vin din `src/lib/pricing.ts`; pragul de volum e găsit, nu scris
 * de mână. Nu spune nimic despre transport — acela vine de la server, la checkout.
 */

const DISMISS_KEY = "cm_progress_dismissed";
const lei = (bani: number) => `${Math.round(bani) / 100} lei`;

function volumeThreshold(): number {
  for (let q = 1; q <= 40; q++) if (getVolumeUnitPriceBani(q) !== null) return q;
  return 2;
}

export function CartProgressBar() {
  const { totalQty } = useShop();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (totalQty === 0 || dismissed) return null;

  const threshold = volumeThreshold();
  const unlocked = getVolumeUnitPriceBani(totalQty) !== null;
  const missing = Math.max(0, threshold - totalQty);
  const progress = Math.min(1, totalQty / threshold);
  const saved = calculateDisplayedTotals(totalQty).discount;

  // Două lungimi: pe telefon rândul are ~220px, pe desktop încape fraza întreagă.
  const message = unlocked
    ? { long: `Preț de volum activ · economisești ${saved} lei`, short: "Preț de volum activ" }
    : {
        long:
          missing === 1
            ? `Încă o cutiuță și plătești ${lei(VOLUME_PRICE_BANI)} pe fiecare`
            : `Încă ${missing} cutiuțe și plătești ${lei(VOLUME_PRICE_BANI)} pe fiecare`,
        short:
          missing === 1
            ? `Încă una → ${lei(VOLUME_PRICE_BANI)}/buc`
            : `Încă ${missing} → ${lei(VOLUME_PRICE_BANI)}/buc`,
      };
  const detail = unlocked
    ? {
        long: `${lei(VOLUME_PRICE_BANI)}/buc în loc de ${lei(PRODUCT_BASE_PRICE_BANI)}`,
        short: `economisești ${saved} lei`,
      }
    : {
        long: `${totalQty} în coș · ${lei(PRODUCT_BASE_PRICE_BANI)} acum`,
        short: `${totalQty} în coș · acum ${lei(PRODUCT_BASE_PRICE_BANI)}/buc`,
      };

  return (
    <div
      className="cart-progress fixed inset-x-0 bottom-3 z-40 flex justify-start px-3 pr-[76px] sm:bottom-5 sm:justify-center sm:px-4 sm:pr-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-[34rem] items-center gap-3 rounded-2xl border border-[color:var(--gold)]/35 bg-[oklch(0.2_0.035_40/0.93)] px-3.5 py-2.5 text-[color:var(--cream)] shadow-[0_18px_44px_-16px_oklch(0.2_0.05_40/0.8),inset_0_1px_0_oklch(0.95_0.05_85/0.1)] backdrop-blur-xl">
        <span
          aria-hidden
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(oklch(0.8 0.15 75) ${progress * 360}deg, oklch(0.96 0.02 80 / 0.14) 0deg)`,
          }}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[oklch(0.2_0.035_40)] text-[11px] font-semibold tabular-nums text-[color:var(--gold)]">
            {unlocked ? <Sparkles className="h-3.5 w-3.5" /> : `${totalQty}/${threshold}`}
          </span>
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-display text-[0.98rem] tracking-tight">
            <span className="sm:hidden">{message.short}</span>
            <span className="hidden sm:inline">{message.long}</span>
          </p>
          <p className="truncate text-[11px] text-[color:var(--cream)]/60 tabular-nums">
            <span className="sm:hidden">{detail.short}</span>
            <span className="hidden sm:inline">{detail.long}</span>
          </p>
        </div>

        <Link
          to={unlocked ? "/comanda" : "/produse"}
          className="group hidden shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,oklch(0.92_0.09_85),oklch(0.78_0.14_62))] px-3.5 py-1.5 text-xs font-medium text-[color:var(--wood-dark)] transition hover:brightness-105 min-[420px]:inline-flex"
        >
          {unlocked ? "Finalizează" : "Mai alege"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              window.sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // Fără sessionStorage bara rămâne închisă doar până la reîncărcare.
            }
          }}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[color:var(--cream)]/55 transition hover:bg-white/10 hover:text-[color:var(--cream)]"
          aria-label="Ascunde bara de progres"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
