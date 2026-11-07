import { createFileRoute } from "@tanstack/react-router";
import Statistics from "@/admin/pages/Statistics";
import { readAnalyticsSearch } from "@/lib/analytics-report";
export const Route = createFileRoute("/_authenticated/admin/statistics")({
  validateSearch: readAnalyticsSearch,
  component: Page,
  head: () => ({ meta: [{ title: "Admin · Statistici și trafic" }] }),
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <Statistics
      search={search}
      onChange={(next) => {
        void navigate({ search: next });
      }}
    />
  );
}
