import { createFileRoute } from "@tanstack/react-router";
import Orders from "@/admin/pages/Orders";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: Orders,
  head: () => ({ meta: [{ title: "Admin · Comenzi" }] }),
});
