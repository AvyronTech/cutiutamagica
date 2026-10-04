import { createFileRoute } from "@tanstack/react-router";
import NotificationCenter from "@/admin/pages/NotificationCenter";
export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationCenter,
});
