import { createFileRoute } from "@tanstack/react-router";
import Financiar from "@/admin/pages/Financiar";
import { CheckoutConnections } from "@/admin/pages/CheckoutConnections";

export const Route = createFileRoute("/_authenticated/admin/financiar")({
  component: () => (
    <div className="space-y-10">
      <Financiar />
      <CheckoutConnections />
    </div>
  ),
  head: () => ({ meta: [{ title: "Admin · Financiar" }] }),
});
