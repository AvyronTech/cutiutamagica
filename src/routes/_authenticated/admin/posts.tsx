import { createFileRoute } from "@tanstack/react-router";
import MarketingCenter from "@/admin/pages/MarketingCenter";

export const Route = createFileRoute("/_authenticated/admin/posts")({
  component: () => <MarketingCenter initialTab="content" />,
});
