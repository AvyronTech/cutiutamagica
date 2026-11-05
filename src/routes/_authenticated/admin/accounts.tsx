import { createFileRoute } from "@tanstack/react-router";
import AccountVault from "@/admin/pages/AccountVault";

export const Route = createFileRoute("/_authenticated/admin/accounts")({
  component: AccountVault,
});
