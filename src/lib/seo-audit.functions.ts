import { auditSeoCatalog } from "@/lib/seo-audit";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import { listPublicCatalog } from "@/server/db/catalog.repository";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

export const getSeoAudit = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "reports.read");
    return auditSeoCatalog(await listPublicCatalog(env.DB));
  });
