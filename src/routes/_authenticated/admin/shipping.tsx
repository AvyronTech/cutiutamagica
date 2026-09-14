import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  component: () => (
    <OperationsPage
      area="shipping"
      title="Livrare"
      description="Rutare comenzi, AWB, pickup, tracking și lockere, pregătite pentru adaptorul SmartShip."
      icon={Truck}
      capabilities={[
        "Contract unic pentru AWB și tracking",
        "Webhook-uri idempotente",
        "Retry și dead-letter queue",
        "Alegerea locației de fulfillment",
      ]}
      activationNote="Cheia SmartShip se adaugă ca Worker Secret SMARTSHIP_API_KEY. Dashboardul nu va afișa și nu va salva cheia în D1."
    />
  ),
});
