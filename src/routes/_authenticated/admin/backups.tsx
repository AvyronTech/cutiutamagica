import { createFileRoute } from "@tanstack/react-router";
import BackupCenter from "@/admin/pages/BackupCenter";

export const Route = createFileRoute("/_authenticated/admin/backups")({
  head: () => ({ meta: [{ title: "Admin · Copii de siguranță | Cutiuța Magică" }] }),

  component: BackupCenter,
});
