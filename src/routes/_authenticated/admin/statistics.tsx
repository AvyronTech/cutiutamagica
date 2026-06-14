import { createFileRoute } from "@tanstack/react-router";
import Statistics from "@/admin/pages/Statistics";

export const Route = createFileRoute("/_authenticated/admin/statistics")({
  component: Statistics,
  head: () => ({ meta: [{ title: "Admin · Statistici" }] }),
});
