import { CalendarDays, Sparkles, Truck } from "lucide-react";
import { useEffect, useState } from "react";

export function ProductDeliveryEstimate() {
  const [easyboxEnabled, setEasyboxEnabled] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <section className="product-delivery-promise" aria-label="Informații despre livrare">
      <div className="product-delivery-promise__orbit" aria-hidden />
      <div className="product-delivery-promise__heading">
        <span className="product-delivery-promise__icon">
          <CalendarDays />
        </span>
        <div>
          <small>Livrare în România</small>
          <strong>Costul și termenul se stabilesc după adresă</strong>
        </div>
      </div>
      <p className="product-delivery-promise__cutoff">
        <Truck />
        <span>Curier la adresă{easyboxEnabled ? " · Easybox, unde este disponibil" : ""}</span>
      </p>
      <p className="product-delivery-promise__note">
        <Sparkles /> În checkout vezi opțiunile și prețul final; data apare când curierul o
        confirmă.
      </p>
    </section>
  );
}
