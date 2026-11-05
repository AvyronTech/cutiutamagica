import { createFileRoute } from "@tanstack/react-router";
import { InventoryWorkspace } from "@/admin/pages/UnifiedWorkspaces";
import { readWorkspaceSearch } from "@/lib/admin-workspaces";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  validateSearch: (search) => readWorkspaceSearch("inventory", search),
  component: Page,
  head: () => ({ meta: [{ title: "Admin · Stocuri și aprovizionare" }] }),
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <InventoryWorkspace
      search={search}
      onChange={(next) => {
        void navigate({ search: next });
      }}
    />
  );
}
