import { createFileRoute } from "@tanstack/react-router";
import Products from "@/admin/pages/Products";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: Products,
  head: () => ({ meta: [{ title: "Admin · Produse" }] }),
});
