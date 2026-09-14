import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/posts")({
  component: () => (
    <OperationsPage
      area="posts"
      title="Postări și conținut"
      description="Calendar editorial pentru Facebook, Instagram, TikTok și alte conturi, cu postări, story, reels și video."
      icon={Send}
      capabilities={[
        "Draft, review, aprobare și programare",
        "Media păstrată în R2",
        "ID extern și stare de publicare",
        "Atribuire la campanie și produs",
      ]}
      activationNote="Publicarea automată rămâne oprită până la aprobarea conturilor și permisiunilor API. Agenții AI pot propune, nu pot publica fără aprobare."
    />
  ),
});
