import { createFileRoute } from "@tanstack/react-router";
import MarketingCenter from "@/admin/pages/MarketingCenter";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: () => <MarketingCenter />,
  head: () => ({ meta: [{ title: "Admin · Marketing | Cutiuța Magică" }] }),
});
