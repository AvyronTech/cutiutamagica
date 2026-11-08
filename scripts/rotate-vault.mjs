#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
// Offline preparation only. Ciphertext in/out, master keys from environment, no API calls.
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const input = arg("input"),
  output = arg("output");
if (!input || !output)
  throw new Error(
    "Use --input=<ciphertext-only.json> --output=<private-plan.sql>. Keys belong in CUTIUTA_VAULT_OLD_KEY and CUTIUTA_VAULT_NEW_KEY environment variables.",
  );
async function key(name) {
  const value = process.env[name] || "";
  const bytes = Buffer.from(value, "base64");
  if (bytes.length !== 32) throw new Error(`Invalid ${name}: expected 32 bytes in Base64.`);
  return webcrypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const oldKey = await key("CUTIUTA_VAULT_OLD_KEY"),
  newKey = await key("CUTIUTA_VAULT_NEW_KEY");
const rows = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(rows) || rows.length > 1000) throw new Error("Invalid ciphertext inventory.");
const statements = [];
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
for (const row of rows) {
  const integration = row.table === "integration_credentials",
    service = row.table === "security_service_identities";
  if ((!integration && !service) || !/^[-a-zA-Z0-9._]{1,100}$/.test(row.id || ""))
    throw new Error("Invalid ciphertext record identity.");
  const field = row.field || "ciphertext";
  if (
    !["ciphertext", "previous_ciphertext"].includes(field) ||
    (integration && field !== "ciphertext")
  )
    throw new Error("Invalid ciphertext field.");
  if (!integration && (!Number.isSafeInteger(row.version) || row.version < 1))
    throw new Error("Missing service key version.");
  const context = integration ? row.id : `service/${row.id}/${row.version}`;
  if (typeof row.ciphertext !== "string" || typeof row.iv !== "string")
    throw new Error("Missing sealed value.");
  let plaintext;
  const algorithm = {
    name: "AES-GCM",
    iv: Buffer.from(row.iv, "base64"),
    additionalData: new TextEncoder().encode(context),
  };
  try {
    plaintext = await webcrypto.subtle.decrypt(
      algorithm,
      oldKey,
      Buffer.from(row.ciphertext, "base64"),
    );
  } catch {
    plaintext = await webcrypto.subtle.decrypt(
      algorithm,
      newKey,
      Buffer.from(row.ciphertext, "base64"),
    );
  }
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const sealed = await webcrypto.subtle.encrypt({ ...algorithm, iv }, newKey, plaintext);
  new Uint8Array(plaintext).fill(0);
  const ivField = field === "ciphertext" ? "iv" : "previous_iv",
    idField = integration ? "provider" : "id";
  statements.push(
    `UPDATE ${row.table} SET ${field}=${quote(Buffer.from(sealed).toString("base64"))},${ivField}=${quote(Buffer.from(iv).toString("base64"))} WHERE ${idField}=${quote(row.id)} AND ${field}=${quote(row.ciphertext)} AND ${ivField}=${quote(row.iv)};`,
  );
}
writeFileSync(
  output,
  "-- Ciphertext-only CAS plan. Keep both master keys until every affected row is verified.\n" +
    statements.join("\n") +
    "\n",
  { mode: 0o600, flag: "wx" },
);
console.log(`Prepared ${statements.length} encrypted updates. No database or provider changed.`);
