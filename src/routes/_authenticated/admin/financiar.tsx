import { createFileRoute } from "@tanstack/react-router";
import Financiar from "@/admin/pages/Financiar";

export const Route = createFileRoute("/_authenticated/admin/financiar")({
  component: Financiar,
  head: () => ({ meta: [{ title: "Admin · Financiar" }] }),
});
