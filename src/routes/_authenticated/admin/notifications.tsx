import { createFileRoute } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: () => (
    <OperationsPage
      area="notifications"
      title="Notificări"
      description="Centru pentru alerte in-app, push, e-mail și webhook, cu preferințe individuale și ore de liniște."
      icon={BellRing}
      capabilities={[
        "Preferințe pe eveniment și severitate",
        "Livrare asincronă cu retry",
        "Dispozitive PWA revocabile",
        "Istoric de livrare și erori",
      ]}
      activationNote="Push necesită cheile VAPID în Workers Secrets și permisiune acordată pe fiecare dispozitiv. Sunetele pornesc numai după interacțiunea utilizatorului."
    />
  ),
});
