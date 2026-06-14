import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/admin/pages/Dashboard";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Admin · Dashboard" }] }),
});
