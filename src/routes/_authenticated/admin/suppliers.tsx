import { createFileRoute } from "@tanstack/react-router";
import GrowthSettings from "@/admin/pages/GrowthSettings";
export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  component: () => <GrowthSettings section="supplier_research" />,
});
