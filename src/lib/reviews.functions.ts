import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { listReviews } from "@/server/api/reviews";
export const getPublicReviews = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      slug: z
        .string()
        .regex(/^[a-z0-9-]{1,128}$/)
        .nullable(),
    }),
  )
  .handler(({ data }) => listReviews(env, data.slug));
