import { createFileRoute } from "@tanstack/react-router";
import QRGenerator from "@/admin/pages/QRGenerator";

export const Route = createFileRoute("/_authenticated/admin/qr-generator")({
  component: QRGenerator,
  head: () => ({ meta: [{ title: "Admin · Generator QR" }] }),
});
