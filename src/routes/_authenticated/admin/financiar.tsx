import { createFileRoute } from "@tanstack/react-router";
import Financiar from "@/admin/pages/Financiar";
import GrowthSettings from "@/admin/pages/GrowthSettings";

export const Route = createFileRoute("/_authenticated/admin/financiar")({
  component: () => (
    <div className="space-y-10">
      <Financiar />
      <GrowthSettings section="finance" />
    </div>
  ),
  head: () => ({ meta: [{ title: "Admin · Financiar" }] }),
});
