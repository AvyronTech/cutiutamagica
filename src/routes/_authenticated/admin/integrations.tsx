import { createFileRoute } from "@tanstack/react-router";
import Integrations from "@/admin/pages/Integrations";

export const Route = createFileRoute("/_authenticated/admin/integrations")({
  component: Integrations,
  head: () => ({ meta: [{ title: "Admin · Integrări" }] }),
});
