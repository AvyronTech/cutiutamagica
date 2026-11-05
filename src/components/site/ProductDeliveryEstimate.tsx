import { CalendarDays, Sparkles, Truck } from "lucide-react";
import { freeShippingLabel, type PublicShippingPolicy } from "@/lib/shipping-seo";

export function ProductDeliveryEstimate({ policy }: { policy: PublicShippingPolicy | null }) {
  const freeLabel = freeShippingLabel(policy);

  return (
    <section className="product-delivery-promise" aria-label="Informații despre livrare">
      <div className="product-delivery-promise__orbit" aria-hidden />
      <div className="product-delivery-promise__heading">
        <span className="product-delivery-promise__icon">
          <CalendarDays />
        </span>
        <div>
          <small>Livrare în România</small>
          <strong>{freeLabel ?? "Costul și termenul se stabilesc după adresă"}</strong>
        </div>
      </div>
      <p className="product-delivery-promise__cutoff">
        <Truck />
        <span>Curier la adresă{policy?.easybox ? " · Easybox, unde este disponibil" : ""}</span>
      </p>
      <p className="product-delivery-promise__note">
        <Sparkles /> {freeLabel ? "Pragul se aplică produselor după reduceri. " : ""}În checkout
        vezi opțiunile, costul final și estimarea curierului.
      </p>
    </section>
  );
}
