import { createFileRoute } from "@tanstack/react-router";
import Customers from "@/admin/pages/Customers";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: Customers,
  head: () => ({ meta: [{ title: "Clienți și membri · Cutiuța Magică" }] }),
});
