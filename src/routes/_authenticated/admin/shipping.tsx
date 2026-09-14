import { createFileRoute } from "@tanstack/react-router";
import Shipping from "@/admin/pages/Shipping";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  component: Shipping,
});
