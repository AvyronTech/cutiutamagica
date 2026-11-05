import { createFileRoute } from "@tanstack/react-router";
import { SocialWorkspace } from "@/admin/pages/UnifiedWorkspaces";
import { readWorkspaceSearch } from "@/lib/admin-workspaces";

export const Route = createFileRoute("/_authenticated/admin/social")({
  validateSearch: (search) => readWorkspaceSearch("social", search),
  component: Page,
  head: () => ({ meta: [{ title: "Admin · Rețele sociale și postări" }] }),
});
function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SocialWorkspace
      search={search}
      onChange={(next) => {
        void navigate({ search: next });
      }}
    />
  );
}
