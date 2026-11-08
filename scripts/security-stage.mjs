#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
// Snapshot the built application; later production rebuilds cannot restart this local preview.
const destination = process.argv.find((a) => a.startsWith("--output="))?.slice(9);
if (
  !destination ||
  ![resolve(tmpdir()), "/tmp", "/private/tmp"].some((dir) =>
    resolve(destination).startsWith(join(dir, "cutiuta-security-built-")),
  )
)
  throw new Error("Use --output=/tmp/cutiuta-security-built-<disposable-name>.");
const root = ts.parseConfigFileTextToJson("wrangler.jsonc", readFileSync("wrangler.jsonc", "utf8"));
if (root.error) throw new Error("Invalid source configuration.");
mkdirSync(destination, { recursive: true });
cpSync("dist", destination, { recursive: true });
const file = join(destination, "server/wrangler.json"),
  config = JSON.parse(readFileSync(file, "utf8"));
for (const key of [
  "name",
  "d1_databases",
  "kv_namespaces",
  "r2_buckets",
  "queues",
  "analytics_engine_datasets",
])
  config[key] = root.config[key];
config.vars = {
  APP_ENV: "local",
  PUBLIC_SITE_URL: "http://127.0.0.1:8088",
  ADMIN_ACCESS_MODE: "off",
};
config.workers_dev = false;
config.preview_urls = false;
config.routes = [];
config.triggers = {};
config.services = [];
delete config.ai;
delete config.send_email;
delete config.env;
for (const binding of config.d1_databases)
  binding.migrations_dir = resolve("cloudflare/d1/migrations");
writeFileSync(file, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
console.log(
  `Prepared local-only build at ${destination}. No secrets, remote bindings, emails, AI calls, cron or deployment activated.`,
);
