import { createFileRoute } from "@tanstack/react-router";
import Dropshipping from "@/admin/pages/Dropshipping";
export const Route = createFileRoute("/_authenticated/admin/dropshipping")({
  component: Dropshipping,
  head: () => ({
    meta: [{ title: "Admin · Dropshipping" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});
