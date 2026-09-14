import { createFileRoute } from "@tanstack/react-router";
import { Warehouse } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: () => (
    <OperationsPage
      area="inventory"
      title="Stocuri și depozite"
      description="Stoc canonic pe variante, locații proprii, furnizori, depozite terțe și fulfillment marketplace."
      icon={Warehouse}
      capabilities={[
        "Rezervări tranzacționale pe comandă",
        "Mișcări de stoc auditabile",
        "Stoc de siguranță pe locație",
        "Pregătit pentru reconciliere eMAG și depozite externe",
      ]}
      activationNote="Activează o locație numai după inventarul inițial. Stocul extern va fi sincronizat prin coadă, cu buffer separat pe canal."
    />
  ),
});
