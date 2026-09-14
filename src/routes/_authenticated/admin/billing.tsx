import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: () => (
    <OperationsPage
      area="billing"
      title="Facturare și documente"
      description="Serii, facturi, storno, proforme și exporturi fiscale, cu documentele generate păstrate în R2."
      icon={FileText}
      capabilities={[
        "Numerotare separată pe tip de document",
        "Snapshot fiscal pentru emitere reproductibilă",
        "PDF/XML/CSV în R2 cu checksum",
        "Jurnal de audit și export contabil",
      ]}
      activationNote="Datele firmei, cotele fiscale și furnizorul de facturare trebuie validate de contabil înainte de emiterea documentelor reale."
    />
  ),
});
