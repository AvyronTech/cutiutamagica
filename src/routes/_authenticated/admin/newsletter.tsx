import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import OperationsPage from "@/admin/pages/OperationsPage";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: () => (
    <OperationsPage
      area="newsletter"
      title="Newsletter"
      description="Abonări confirmate, segmente, campanii și dezabonare sigură pentru promoții și povești."
      icon={Mail}
      capabilities={[
        "Double opt-in și dovadă de consimțământ",
        "Conținut și media în R2",
        "Review înainte de trimitere",
        "Bounce, complaint și unsubscribe",
      ]}
      activationNote="Trimiterea este dezactivată până la configurarea domeniului de e-mail, SPF, DKIM, DMARC și a furnizorului tranzacțional."
    />
  ),
});
