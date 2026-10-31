import { createFileRoute } from "@tanstack/react-router";
import SeoAuditPage from "@/admin/pages/SeoAuditPage";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  component: SeoAuditPage,
  head: () => ({
    meta: [{ title: "SEO și indexare · Admin", name: "robots", content: "noindex, nofollow" }],
  }),
});
