import { createFileRoute } from "@tanstack/react-router";
import Financiar from "@/admin/pages/Financiar";
import { CheckoutConnections } from "@/admin/pages/CheckoutConnections";
import GrowthSettings from "@/admin/pages/GrowthSettings";

export const Route = createFileRoute("/_authenticated/admin/financiar")({
  component: () => (
    <div className="space-y-10">
      <Financiar />
      <CheckoutConnections />
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5 md:p-6">
        <GrowthSettings section="finance" embedded showCredentials={false} />
      </section>
    </div>
  ),
  head: () => ({ meta: [{ title: "Admin · Financiar" }] }),
});
