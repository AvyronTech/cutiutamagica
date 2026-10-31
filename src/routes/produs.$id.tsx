import { catalogProducts } from "@/lib/catalog-products";
import { isKnownProductId, productPath } from "@/lib/product-url";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/produs/$id")({
  loader: async ({ params }) => {
    const pricing = await getStorePricing();
    const exists = catalogProducts(pricing.catalog).some((product) => product.id === params.id);
    if (exists) throw redirect({ href: productPath(params.id), statusCode: 301 });
    if (isKnownProductId(params.id)) throw redirect({ href: "/produse", statusCode: 301 });
    throw notFound();
  },
});
