#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";
// Produces a reviewable plan only. No API calls, DNS updates, deployment, secrets or paid resources.
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const hostname = arg("admin-host") || "app.cutiutamagica.eu";
if (
  !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cutiutamagica\.eu$/.test(hostname) ||
  ["api", "www"].some((prefix) => hostname === `${prefix}.cutiutamagica.eu`)
)
  throw new Error("Use an internal subdomain of cutiutamagica.eu.");
const parsed = ts.parseConfigFileTextToJson(
  "wrangler.jsonc",
  readFileSync("wrangler.jsonc", "utf8"),
);
if (parsed.error) throw new Error("Invalid Wrangler configuration.");
const config = parsed.config;
const production = config.env.production;
production.vars = {
  ...production.vars,
  ADMIN_HOSTNAME: hostname,
  ADMIN_HOST_MODE: hostname === "app.cutiutamagica.eu" ? "compatible" : "dedicated",
  ADMIN_ACCESS_MODE: "off",
};
if (!production.routes.some((r) => r.pattern === hostname))
  production.routes.push({ pattern: hostname, custom_domain: true });
const plan = {
  mode: "review-only",
  accountId: config.account_id,
  worker: production.name,
  adminHost: hostname,
  resources: "Existing Worker, D1, R2 and KV; no duplicate application or database",
  mfa: "preparation_only",
  stagedConfiguration: config,
  access: {
    teamDomain: "https://cutiuta-magica.cloudflareaccess.com",
    state: "not-created-for-store",
    audience: "Read from the new application after a validated pilot; never invent this value",
    humanPolicies: [
      {
        role: "owner",
        decision: "allow",
        identities: "Existing owners selected explicitly; no Everyone or email-domain wildcard",
      },
      {
        role: "staff",
        decision: "allow",
        identities: "Explicit verified employee group; app RBAC still required",
      },
      {
        role: "consultant",
        decision: "allow",
        identities: "Explicit verified collaborator group; no admin inheritance",
      },
    ],
    servicePolicy: {
      decision: "non_identity",
      scope: "Only /api/v1/integrations/ai-studio/runner/*",
      audience:
        "Set ACCESS_SERVICE_APPLICATION_AUD from the actual separate service application; never reuse another Worker audience",
      identities:
        "Individual Access service token IDs bound to encrypted runner identities; no Bypass policy",
    },
    coverage: [
      `${hostname}/*`,
      "Private server functions on public/legacy hosts require application JWT validation; do not gate public /_serverFn/* globally",
      "Private API aliases must retain JWT + session + role checks",
    ],
  },
  prerequisites: [
    "Verify owner login and a second independent recovery session",
    "Validate Access signed JWT issuer/audience/email and runner common_name in an isolated pilot",
    "Audit workers.dev and preview consumers before disabling",
    "Migrate every runner before ALLOW_LEGACY_AI_RUNNER=false",
    "Verify customer OAuth, checkout, webhook signatures, SEO crawlers and mobile",
    "Approve any new DNS route separately before applying",
  ],
  rollback: {
    access:
      "Set ADMIN_ACCESS_MODE=off using an authenticated Cloudflare owner/CLI, then remove only the newly created Access application if necessary; retain shop password authentication",
    code: "Roll back to the recorded pre-release Worker version; keep additive migration 0092",
    emergency:
      "Existing independent Cloudflare owner access with recorded rollback; no URL bypass or new privileged account",
  },
};
const output = arg("output");
if (output) {
  writeFileSync(output, JSON.stringify(plan, null, 2) + "\n", { mode: 0o600 });
  console.log(`Review-only security plan written to ${output}. Nothing applied.`);
} else process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
