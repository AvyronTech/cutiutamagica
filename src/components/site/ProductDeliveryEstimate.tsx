import { Truck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicShippingPolicy } from "@/lib/shipping-seo";

export function ProductDeliveryEstimate({ policy }: { policy: PublicShippingPolicy | null }) {
  return (
    <section className="product-delivery-promise" aria-label="Informații despre livrare">
      <div className="product-delivery-compact-heading">
        <Truck size={17} aria-hidden />
        <strong>Livrare în România</strong>
      </div>
      <p>Curier{policy?.easybox ? " sau Easybox" : ""} · cost și termen în checkout.</p>
      <Link to="/cont" className="product-first-order-benefit">
        Prima comandă: transport gratuit cu un cont Magic.
      </Link>
    </section>
  );
}
