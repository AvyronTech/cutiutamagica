import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";
import MarketingOrdersAgentControl from "@/admin/pages/MarketingOrdersAgentControl";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: () => (
    <div className="space-y-6">
      <OperationsPage
        area="ai"
        title="Social Media Agent"
        description="Spațiul agentului care pregătește în Codex idei, texte și propuneri pentru canalele sociale, cu surse controlate și aprobare umană."
        icon={Bot}
        capabilities={[
          "Surse cu nivel de încredere și revalidare",
          "Instrumente permise explicit per agent",
          "Buget și limită de acțiuni per rulare",
          "Aprobări pentru orice acțiune externă",
        ]}
        activationNote="Agentul lucrează în mod schiță și aprobare. Publicarea externă rămâne blocată până când un administrator aprobă explicit și conectorul este verificat."
      />
      <MarketingOrdersAgentControl />
    </div>
  ),
});
