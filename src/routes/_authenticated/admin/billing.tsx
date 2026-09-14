import { createFileRoute } from "@tanstack/react-router";
import Billing from "@/admin/pages/Billing";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: Billing,
});
