import { createFileRoute } from "@tanstack/react-router";
import Reviews from "@/admin/pages/Reviews";
export const Route = createFileRoute("/_authenticated/admin/reviews")({
  validateSearch: (value: Record<string, unknown>) => ({
    product:
      typeof value.product === "string" && /^[a-z0-9-]{1,128}$/.test(value.product)
        ? value.product
        : undefined,
  }),
  component: Page,
});
function Page() {
  return <Reviews productSlug={Route.useSearch().product} />;
}
