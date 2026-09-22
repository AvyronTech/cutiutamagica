import { createFileRoute } from "@tanstack/react-router";
import EmailHub from "@/admin/pages/EmailHub";
import GrowthSettings from "@/admin/pages/GrowthSettings";
export const Route = createFileRoute("/_authenticated/admin/email")({
  component: EmailPage,
});

function EmailPage() {
  return (
    <div className="space-y-10">
      <EmailHub />
      <section className="border-t border-slate-700 pt-8">
        <GrowthSettings section="owner_reports" embedded showCredentials={false} />
      </section>
    </div>
  );
}
