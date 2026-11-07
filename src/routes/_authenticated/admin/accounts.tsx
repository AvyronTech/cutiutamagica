import { createFileRoute } from "@tanstack/react-router";
import AccountVault from "@/admin/pages/AccountVault";

export const Route = createFileRoute("/_authenticated/admin/accounts")({
  head: () => ({ meta: [{ title: "Admin · Conturi și dispozitive | Cutiuța Magică" }] }),

  component: AccountVault,
});
