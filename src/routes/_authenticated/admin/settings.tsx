import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/admin/pages/Settings";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Admin · Setări" }] }),
});
