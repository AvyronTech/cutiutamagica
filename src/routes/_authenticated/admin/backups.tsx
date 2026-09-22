import { createFileRoute } from "@tanstack/react-router";
import BackupCenter from "@/admin/pages/BackupCenter";

export const Route = createFileRoute("/_authenticated/admin/backups")({
  component: BackupCenter,
});
