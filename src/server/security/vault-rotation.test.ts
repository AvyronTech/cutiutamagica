import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { securityDatabase } from "./testing/database";
import { encryptSecretValue, decryptSecretValue } from "../services/growth-settings";
describe("offline vault rotation plan", () => {
  it("produces private ciphertext-only CAS updates compatible with the Worker and detects invalid AAD", async () => {
    const d = securityDatabase();
    const dir = mkdtempSync(join(tmpdir(), "cutiuta-vault-test-"));
    try {
      const old = btoa("O".repeat(32)),
        next = btoa("N".repeat(32));
      const sealed = await encryptSecretValue(
        { INTEGRATION_ENCRYPTION_KEY: old },
        "test-only-private-provider-token",
        "provider_a",
      );
      d.sql
        .prepare(
          "INSERT INTO integration_credentials(provider,ciphertext,iv,updated_at) VALUES('provider_a',?,?,datetime('now'))",
        )
        .run(sealed.ciphertext, sealed.iv);
      const input = join(dir, "ciphertext.json"),
        output = join(dir, "plan.sql");
      writeFileSync(
        input,
        JSON.stringify([{ table: "integration_credentials", id: "provider_a", ...sealed }]),
        { mode: 0o600 },
      );
      const result = execFileSync(
        process.execPath,
        ["scripts/rotate-vault.mjs", `--input=${input}`, `--output=${output}`],
        {
          encoding: "utf8",
          env: { ...process.env, CUTIUTA_VAULT_OLD_KEY: old, CUTIUTA_VAULT_NEW_KEY: next },
        },
      );
      const sql = readFileSync(output, "utf8");
      expect(statSync(output).mode & 0o777).toBe(0o600);
      for (const value of [old, next, "test-only-private-provider-token"]) {
        expect(result).not.toContain(value);
        expect(sql).not.toContain(value);
      }
      d.sql.exec(sql);
      const row = d.sql
        .prepare("SELECT ciphertext,iv FROM integration_credentials WHERE provider='provider_a'")
        .get() as { ciphertext: string; iv: string };
      expect(
        await decryptSecretValue({ INTEGRATION_ENCRYPTION_KEY: next }, row, "provider_a"),
      ).toBe("test-only-private-provider-token");
      await expect(
        decryptSecretValue({ INTEGRATION_ENCRYPTION_KEY: next }, row, "provider_b"),
      ).rejects.toBeDefined();
      const renewed = row.ciphertext;
      d.sql.exec(sql);
      expect(
        d.sql
          .prepare("SELECT ciphertext FROM integration_credentials WHERE provider='provider_a'")
          .get(),
      ).toMatchObject({ ciphertext: renewed });
    } finally {
      d.sql.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
