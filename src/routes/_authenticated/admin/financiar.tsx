import { readFinanceSearch } from "@/lib/analytics-report";
import { createFileRoute } from "@tanstack/react-router";
import Financiar from "@/admin/pages/Financiar";
import { CheckoutConnections } from "@/admin/pages/CheckoutConnections";
import GrowthSettings from "@/admin/pages/GrowthSettings";

export const Route = createFileRoute("/_authenticated/admin/financiar")({
  validateSearch: readFinanceSearch,
  component: Page,
  head: () => ({ meta: [{ title: "Admin · Financiar" }] }),
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <div className="space-y-10">
      <Financiar
        {...search}
        onChange={(next) => {
          void navigate({ search: next });
        }}
      />
      <CheckoutConnections />
      <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5 md:p-6">
        <GrowthSettings section="finance" embedded showCredentials={false} />
      </section>
    </div>
  );
}
