import { createFileRoute, redirect } from "@tanstack/react-router";
import { readAnalyticsSearch } from "@/lib/analytics-report";
export const Route = createFileRoute("/_authenticated/admin/traffic")({
  validateSearch: readAnalyticsSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/statistics",
      search: { ...search, tab: search.tab === "sources" ? "sources" : "traffic" },
      replace: true,
    });
  },
});
