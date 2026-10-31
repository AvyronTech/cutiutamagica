import { createFileRoute } from "@tanstack/react-router";
import Promotions from "@/admin/pages/Promotions";
export const Route = createFileRoute("/_authenticated/admin/promotions")({ component: Promotions });
