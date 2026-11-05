import { createFileRoute } from "@tanstack/react-router";
import { IdentificationWorkspace } from "@/admin/pages/UnifiedWorkspaces";
import { readWorkspaceSearch } from "@/lib/admin-workspaces";

export const Route = createFileRoute("/_authenticated/admin/products/identification")({
  validateSearch: (search) => readWorkspaceSearch("identification", search),
  component: Page,
  head: () => ({ meta: [{ title: "Admin · Identificare, etichetare și coduri QR" }] }),
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <IdentificationWorkspace
      search={search}
      onChange={(next) => {
        void navigate({ search: next });
      }}
    />
  );
}
