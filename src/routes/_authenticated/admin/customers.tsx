import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: () => (
    <OperationsPage
      area="customers"
      title="Clienți"
      description="Profil unificat, adrese, comenzi, valoare totală și consimțăminte, separat de datele de autentificare."
      icon={Users}
      capabilities={[
        "Identitate deduplicată după date normalizate",
        "Istoric omnichannel",
        "Consimțământ versionat și retractabil",
        "Anonimizare și retenție controlată",
      ]}
      activationNote="Accesul la date personale este auditat și limitat prin roluri. Exportul și ștergerea vor necesita confirmare explicită."
    />
  ),
});
