import { createFileRoute, redirect } from "@tanstack/react-router";
import { readWorkspaceSearch } from "@/lib/admin-workspaces";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  validateSearch: (search) => readWorkspaceSearch("inventory", search),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin/inventory", search: { ...search, tab: "supply" }, replace: true });
  },
});
