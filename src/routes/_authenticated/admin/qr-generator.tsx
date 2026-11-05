import { createFileRoute, redirect } from "@tanstack/react-router";
import { readWorkspaceSearch } from "@/lib/admin-workspaces";

export const Route = createFileRoute("/_authenticated/admin/qr-generator")({
  validateSearch: (search) => readWorkspaceSearch("identification", search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/products/identification",
      search: { ...search, tab: "orders" },
      replace: true,
    });
  },
});
