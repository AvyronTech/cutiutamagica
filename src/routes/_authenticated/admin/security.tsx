import { createFileRoute } from "@tanstack/react-router";
import SecurityCenter from "@/admin/pages/SecurityCenter";
export const Route = createFileRoute("/_authenticated/admin/security")({
  component: SecurityCenter,
  head: () => ({
    meta: [
      { title: "Admin · Securitate și acces" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
