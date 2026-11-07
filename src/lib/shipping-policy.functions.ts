import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { readPublicShippingPolicy } from "@/server/services/public-shipping-policy";

export const getPublicShippingPolicy = createServerFn({ method: "GET" }).handler(() =>
  readPublicShippingPolicy(env.DB),
);
