import { createFileRoute } from "@tanstack/react-router";
import PersonalizationProcurement from "@/admin/pages/PersonalizationProcurement";

export const Route = createFileRoute("/_authenticated/admin/personalizations")({
  component: PersonalizationProcurement,
  head: () => ({ meta: [{ title: "Admin · Personalizări" }] }),
});
