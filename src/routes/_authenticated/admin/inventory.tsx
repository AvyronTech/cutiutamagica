import { createFileRoute } from "@tanstack/react-router";
import Inventory from "@/admin/pages/Inventory";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: Inventory,
  head: () => ({ meta: [{ title: "Admin · Stoc intern" }] }),
});
