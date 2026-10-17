import { createFileRoute } from "@tanstack/react-router";
import ProductIdentification from "@/admin/pages/ProductIdentification";

export const Route = createFileRoute("/_authenticated/admin/products/identification")({
  component: ProductIdentification,
  head: () => ({ meta: [{ title: "Admin · Identificare și etichetare" }] }),
});
