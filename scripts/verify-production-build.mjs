import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../dist/server/wrangler.json", import.meta.url)));

const expected = {
  name: "cutiuta-magica-store",
  appEnv: "production",
  database: "cutiutamagica-db",
  databaseId: "878ccd18-1dc3-4797-9ba8-16f274f61c09",
  bucket: "cutiutamagica",
  queue: "cutiutamagica-commerce",
  kv: "4b47446eaddb4bff9dd4f374afd72fb5",
};

const actual = {
  name: config.name,
  appEnv: config.vars?.APP_ENV,
  database: config.d1_databases?.find((item) => item.binding === "DB")?.database_name,
  databaseId: config.d1_databases?.find((item) => item.binding === "DB")?.database_id,
  bucket: config.r2_buckets?.find((item) => item.binding === "MEDIA")?.bucket_name,
  queue: config.queues?.producers?.find((item) => item.binding === "COMMERCE_EVENTS")?.queue,
  kv: config.kv_namespaces?.find((item) => item.binding === "CACHE")?.id,
};

const mismatches = Object.entries(expected).filter(([key, value]) => actual[key] !== value);
if (mismatches.length > 0) {
  console.error("Production build binding validation failed:");
  for (const [key, expectedValue] of mismatches) {
    console.error(`- ${key}: expected ${expectedValue}, received ${actual[key] ?? "missing"}`);
  }
  process.exit(1);
}

console.log("Production build bindings verified.");
