import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: () => (
    <OperationsPage
      area="ai"
      title="Agenți AI"
      description="Agenți pentru SEO, piață, conținut și operațiuni, cu surse controlate, costuri măsurate și aprobare umană."
      icon={Bot}
      capabilities={[
        "Surse cu nivel de încredere și revalidare",
        "Instrumente permise explicit per agent",
        "Buget și limită de acțiuni per rulare",
        "Aprobări pentru orice acțiune externă",
      ]}
      activationNote="Agenții sunt intenționat în starea configurare necesară până la alegerea modelului, bugetului și surselor. Nu există auto-învățare necontrolată."
    />
  ),
});
