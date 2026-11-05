import { createFileRoute } from "@tanstack/react-router";
import ChatCenter from "@/admin/pages/ChatCenter";

export const Route = createFileRoute("/_authenticated/admin/chat")({
  validateSearch: (value: Record<string, unknown>) => ({
    conversation:
      typeof value.conversation === "string" &&
      /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value.conversation)
        ? value.conversation
        : undefined,
  }),
  component: Page,
  head: () => ({ meta: [{ title: "Admin · Chat clienți | Cutiuța Magică" }] }),
});

function Page() {
  return <ChatCenter conversationId={Route.useSearch().conversation} />;
}
