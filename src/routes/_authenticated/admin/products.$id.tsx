import { createFileRoute } from "@tanstack/react-router";
import ProductStudio from "@/admin/pages/ProductStudio";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: ProductStudioRoute,
  head: () => ({ meta: [{ title: "Admin · Studio produs" }] }),
});

function ProductStudioRoute() {
  const { id } = Route.useParams();
  return <ProductStudio productId={id} />;
}
