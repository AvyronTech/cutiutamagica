import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/platforms")({
  component: () => (
    <OperationsPage
      area="platforms"
      title="Platforme de vânzare"
      description="eMAG, OLX, Trendyol și Meta Marketplaces folosesc catalogul, stocul și comenzile canonice din D1."
      icon={Store}
      capabilities={[
        "Mapări stabile ID intern și extern",
        "Preț și buffer de stoc pe canal",
        "Importuri validate înainte de aplicare",
        "Reconciliere și reluare erori",
      ]}
      activationNote="Fiecare API se activează numai după acces oficial și health check reușit. OLX rămâne import manual dacă API-ul comercial nu este aprobat."
    />
  ),
});
