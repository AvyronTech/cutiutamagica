import { CalendarDays, Clock3, MapPin, Sparkles, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DeliveryMode = "courier" | "easybox";

function bucharestParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function addBusinessDays(year: number, month: number, day: number, count: number): Date {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  let added = 0;
  while (added < count) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date;
}

export function ProductDeliveryEstimate() {
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<DeliveryMode>("courier");
  const [easyboxEnabled, setEasyboxEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    fetch("/api/v1/commerce/config", { credentials: "same-origin" })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              data?: { shipping?: { easyboxEnabled?: boolean } };
            })
          : null,
      )
      .then((payload) => setEasyboxEnabled(Boolean(payload?.data?.shipping?.easyboxEnabled)))
      .catch(() => undefined);
    return () => window.clearInterval(timer);
  }, []);

  const estimate = useMemo(() => {
    const local = bucharestParts(now);
    const beforeCutoff = local.hour < 12;
    const delivery = addBusinessDays(local.year, local.month, local.day, beforeCutoff ? 2 : 3);
    return {
      beforeCutoff,
      label: new Intl.DateTimeFormat("ro-RO", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(delivery),
      minutesLeft: Math.max(0, 12 * 60 - (local.hour * 60 + local.minute)),
    };
  }, [now]);

  return (
    <section className="product-delivery-promise" aria-label="Estimare de livrare">
      <div className="product-delivery-promise__orbit" aria-hidden />
      <div className="product-delivery-promise__heading">
        <span className="product-delivery-promise__icon">
          <CalendarDays />
        </span>
        <div>
          <small>Estimare dinamică pentru România</small>
          <strong>
            Ajunge aproximativ <em>{estimate.label}</em>
          </strong>
        </div>
      </div>
      <div className="product-delivery-promise__modes" aria-label="Modalitate estimată">
        <button type="button" aria-pressed={mode === "courier"} onClick={() => setMode("courier")}>
          <Truck /> Curier
        </button>
        <button
          type="button"
          aria-pressed={mode === "easybox"}
          aria-disabled={!easyboxEnabled}
          disabled={!easyboxEnabled}
          onClick={() => easyboxEnabled && setMode("easybox")}
        >
          <MapPin /> Easybox
          {!easyboxEnabled && <small>la activare</small>}
        </button>
      </div>
      <p className="product-delivery-promise__cutoff">
        <Clock3 />
        {estimate.beforeCutoff
          ? `Comandă până la 12:00 · ${Math.floor(estimate.minutesLeft / 60)}h ${estimate.minutesLeft % 60}m rămase`
          : "Următoarea fereastră de procesare: mâine până la 12:00"}
      </p>
      <p className="product-delivery-promise__note">
        <Sparkles /> Data este orientativă și se confirmă în checkout, după adresă și metoda aleasă.
      </p>
    </section>
  );
}
