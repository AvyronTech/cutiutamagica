import { createFileRoute } from "@tanstack/react-router";
import ChatCenter from "@/admin/pages/ChatCenter";

export const Route = createFileRoute("/_authenticated/admin/chat")({
  component: ChatCenter,
});
