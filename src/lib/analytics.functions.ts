import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";
import { readAnalyticsOverview } from "@/server/services/analytics-overview";
export const getAnalyticsOverview = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }))
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "reports.read");
    return readAnalyticsOverview(env.DB, data.days);
  });
