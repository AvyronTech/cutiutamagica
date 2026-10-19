import { createFileRoute } from "@tanstack/react-router";
import SocialNetworks from "@/admin/pages/SocialNetworks";

export const Route = createFileRoute("/_authenticated/admin/social")({
  component: SocialNetworks,
  head: () => ({ meta: [{ title: "Admin · Rețele sociale | Cutiuța Magică" }] }),
});
