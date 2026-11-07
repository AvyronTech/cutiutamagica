import { createFileRoute } from "@tanstack/react-router";
import MagicRewardsAdmin from "@/admin/pages/MagicRewards";

export const Route = createFileRoute("/_authenticated/admin/rewards")({
  head: () => ({ meta: [{ title: "Admin · Magic Rewards | Cutiuța Magică" }] }),

  component: MagicRewardsAdmin,
});
