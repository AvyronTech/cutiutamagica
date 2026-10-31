import { createFileRoute } from "@tanstack/react-router";
import Referrals from "@/admin/pages/Referrals";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  component: Referrals,
  head: () => ({ meta: [{ title: "Admin · Referral inteligent" }] }),
});
