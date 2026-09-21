import { createFileRoute } from "@tanstack/react-router";
import GrowthSettings from "@/admin/pages/GrowthSettings";
export const Route = createFileRoute("/_authenticated/admin/email")({
  component: () => <GrowthSettings section="owner_reports" />,
});
