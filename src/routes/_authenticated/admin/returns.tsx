import { createFileRoute } from "@tanstack/react-router";
import Returns from "@/admin/pages/Returns";

export const Route = createFileRoute("/_authenticated/admin/returns")({
  head: () => ({ meta: [{ title: "Admin · Retururi și garanții | Cutiuța Magică" }] }),
  component: Returns,
});
