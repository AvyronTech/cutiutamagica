#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
// Destructive fixtures are permitted ONLY in an explicitly named disposable local security state.
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const base = arg("base"),
  state = arg("state");
if (!base || !state)
  throw new Error(
    "Specify --base=http://127.0.0.1:<port> --state=/tmp/cutiuta-security-<disposable-state>.",
  );
const url = new URL(base);
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.protocol !== "http:" ||
  url.username ||
  url.password ||
  ![resolve(tmpdir()), "/tmp", "/private/tmp"].some((dir) =>
    resolve(state).startsWith(join(dir, "cutiuta-security-")),
  )
)
  throw new Error(
    "Local disposable security staging only. Production and other local states are forbidden.",
  );
const tokens = {};
const statements = [];
const hash = (value, encoding = "hex") => createHash("sha256").update(value).digest(encoding);
for (const role of ["owner", "staff", "consultant", "service"]) {
  const id = `security-smoke-${role}`,
    roleId = role === "owner" ? "role_owner" : `role_security_${role}`;
  tokens[role] = randomBytes(32).toString("hex");
  statements.push(`INSERT OR IGNORE INTO admin_users(id,external_subject,email,display_name,status,onboarding_status) VALUES('${id}','${id}','${role}@security.example.test','Test local ${role}','active','complete');
    INSERT OR IGNORE INTO admin_password_credentials(admin_user_id,password_hash,password_salt,algorithm,iterations,must_change_password) SELECT '${id}',password_hash,password_salt,algorithm,iterations,0 FROM admin_password_credentials LIMIT 1;
    INSERT OR IGNORE INTO admin_user_roles(admin_user_id,role_id) VALUES('${id}','${roleId}');
    INSERT INTO admin_sessions(id,admin_user_id,token_hash,password_version,expires_at,idle_expires_at) SELECT '${randomUUID()}','${id}','${hash(tokens[role], "base64")}',password_version,datetime('now','+30 minutes'),datetime('now','+15 minutes') FROM admin_password_credentials WHERE admin_user_id='${id}';`);
}
tokens.customer = randomBytes(32).toString("hex");
tokens.otherCustomer = randomBytes(32).toString("hex");
for (const [id, key] of [
  ["security-smoke-customer", "customer"],
  ["security-smoke-other-customer", "otherCustomer"],
])
  statements.push(
    `INSERT OR IGNORE INTO review_accounts(id,email,display_name,password_hash,password_salt) VALUES('${id}','${id}@example.test','Client test local','unusable-local-test','unusable-local-test');INSERT INTO review_sessions(token_hash,account_id,expires_at) VALUES('${hash(tokens[key])}','${id}',unixepoch()+1800);`,
  );
const dir = mkdtempSync(join(tmpdir(), "cutiuta-security-probes-"));
try {
  const file = join(dir, "fixture.sql");
  writeFileSync(file, statements.join("\n"), { mode: 0o600 });
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      state,
      "--file",
      file,
    ],
    { stdio: "pipe" },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
const results = [];
async function probe(label, path, expected, { role, method = "GET", body, origin, cookie } = {}) {
  const response = await fetch(new URL(path, url), {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { cookie } : role ? { cookie: `cm_admin_session=${tokens[role]}` } : {}),
      ...(method !== "GET" ? { origin: origin || url.origin } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  results.push({ label, status: response.status, expected, ok: response.status === expected });
  if (response.status !== expected)
    throw new Error(`${label}: expected ${expected}, received ${response.status}`);
  return { response, payload };
}
await probe("Public health", "/api/v1/health", 200);
await probe("Anonymous internal API denied", "/api/v1/admin/security", 401);
await probe("Owner sessions", "/api/v1/admin/security", 200, { role: "owner" });
const staff = await probe("Staff own sessions", "/api/v1/admin/security", 200, { role: "staff" });
if (
  staff.payload.data.canRead ||
  staff.payload.data.canManage ||
  staff.payload.data.services.length
)
  throw new Error("Staff received security administration privileges.");
await probe("Consultant own sessions", "/api/v1/admin/security", 200, { role: "consultant" });
await probe("Service cannot log in interactively", "/api/v1/admin/security", 403, {
  role: "service",
});
await probe("Staff cannot manage identities", "/api/v1/admin/security/services", 403, {
  role: "staff",
  method: "POST",
  body: { action: "create", id: "denied-identity" },
});

const rpcFiles = readdirSync("dist/server/assets").filter((file) =>
  /^admin.functions.*\.js$/.test(file),
);
const rpcSource = rpcFiles
  .map((file) => readFileSync(join("dist/server/assets", file), "utf8"))
  .join("\n");
const commerceRpc = rpcSource.match(
  /id:\s*"([a-f0-9]{64})",\s*name:\s*"getCommerceOperations"/,
)?.[1];
if (!commerceRpc) throw new Error("Missing built commerce server function inventory.");
await probe(
  "Staff cannot read financial configuration through server functions",
  `/_serverFn/${commerceRpc}`,
  403,
  { role: "staff" },
);
await probe("Customer cookie grants no admin rights", "/api/v1/admin/security", 401, {
  cookie: `cm_reviewer=${tokens.customer}`,
});
await probe("Cross-origin mutation denied", "/api/v1/admin/security/sessions", 403, {
  role: "owner",
  method: "POST",
  origin: "https://attacker.example.test",
  body: { action: "rotate" },
});
await probe("Foreign CORS preflight denied", "/api/v1/admin/security", 403, {
  method: "OPTIONS",
  origin: "https://attacker.example.test",
});
await probe("Extra privilege fields rejected", "/api/v1/admin/security/services", 400, {
  role: "owner",
  method: "POST",
  body: { action: "create", id: "denied-extra-fields", roles: ["owner"] },
});
await probe("Non-owned session cannot be revoked", "/api/v1/admin/security/sessions", 404, {
  role: "owner",
  method: "POST",
  body: { action: "revoke", target: randomUUID() },
});
const backupSource = readdirSync("dist/server/assets")
  .filter((file) => /^operations.functions.*\.js$/.test(file))
  .map((file) => readFileSync(join("dist/server/assets", file), "utf8"))
  .join("\n");
const backupRpc = backupSource.match(/id:\s*"([a-f0-9]{64})",\s*name:\s*"runBackupNow"/)?.[1];
if (!backupRpc) throw new Error("Missing built backup server function inventory.");
const backup = await probe("Private application backup completes", `/_serverFn/${backupRpc}`, 200, {
  role: "owner",
  method: "POST",
});
if (!JSON.stringify(backup.payload).includes('"completed"'))
  throw new Error("Application backup did not complete.");
const rotation = await probe("Own session rotates", "/api/v1/admin/security/sessions", 200, {
  role: "owner",
  method: "POST",
  body: { action: "rotate" },
});
if (
  !rotation.response.headers
    .getSetCookie()
    .some((c) => c.includes("HttpOnly") && c.includes("SameSite=Strict"))
)
  throw new Error("Session cookie flags missing.");
await probe("Rotated old token denied", "/api/v1/admin/security", 401, { role: "owner" });
await probe("Customer all-device logout", "/api/v1/reviewer/logout-all", 200, {
  method: "POST",
  cookie: `cm_reviewer=${tokens.customer}`,
});
const signedOut = await probe("Own customer sessions revoked", "/api/v1/reviewer", 200, {
  cookie: `cm_reviewer=${tokens.customer}`,
});
const other = await probe("Other customer remains signed in", "/api/v1/reviewer", 200, {
  cookie: `cm_reviewer=${tokens.otherCustomer}`,
});
if (signedOut.payload.data !== null || other.payload.data?.id !== "security-smoke-other-customer")
  throw new Error("Customer session isolation failed.");
console.log(JSON.stringify({ environment: "disposable-local", results }, null, 2));
