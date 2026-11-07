import { createFileRoute } from "@tanstack/react-router";
import Promotions from "@/admin/pages/Promotions";
export const Route = createFileRoute("/_authenticated/admin/promotions")({
  head: () => ({ meta: [{ title: "Admin · Promoții și prețuri | Cutiuța Magică" }] }),
  component: Promotions,
});
