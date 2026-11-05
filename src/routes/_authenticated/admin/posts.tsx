import { createFileRoute, redirect } from "@tanstack/react-router";
import { readWorkspaceSearch } from "@/lib/admin-workspaces";

export const Route = createFileRoute("/_authenticated/admin/posts")({
  validateSearch: (search) => readWorkspaceSearch("social", search),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin/social", search: { ...search, tab: "posts" }, replace: true });
  },
});
