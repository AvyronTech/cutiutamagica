import { encryptSecretValue, decryptSecretValue } from "../services/growth-settings";
import type { CommerceEnv } from "../integrations/provider-runtime";
import { SecurityError, type SecurityBindings } from "./policy";
import { securityEvent } from "./events";

type ServiceEnv = Omit<CommerceEnv, keyof SecurityBindings> &
  SecurityBindings & { AI_STUDIO_RUNNER_HMAC_SECRET?: string };
type ServiceRow = {
  id: string;
  label: string;
  scope: string;
  key_version: number;
  ciphertext: string;
  iv: string;
  previous_ciphertext: string | null;
  previous_iv: string | null;
  previous_until: string | null;
  expires_at: string;
  revoked_at: string | null;
  access_client_id: string | null;
};
const context = (id: string, version: number) => `service/${id}/${version}`;
function randomSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}

export async function issueServiceIdentity(
  env: ServiceEnv,
  request: Request,
  actor: string,
  input: {
    id: string;
    label: string;
    accessClientId?: string;
    version?: number;
    graceMinutes?: number;
  },
) {
  const secret = randomSecret();
  const version = (input.version || 0) + 1;
  const sealed = await encryptSecretValue(env, secret, context(input.id, version));
  const expiry = new Date(Date.now() + 90 * 86400_000).toISOString();
  const result = input.version
    ? await env.DB.prepare(
        `UPDATE security_service_identities
    SET key_version=?2,previous_ciphertext=ciphertext,previous_iv=iv,previous_until=?3,ciphertext=?4,iv=?5,expires_at=?6,updated_at=?7,access_client_id=CASE WHEN ?9=1 THEN ?10 ELSE access_client_id END
    WHERE id=?1 AND key_version=?8 AND revoked_at IS NULL`,
      )
        .bind(
          input.id,
          version,
          new Date(Date.now() + (input.graceMinutes || 0) * 60_000).toISOString(),
          sealed.ciphertext,
          sealed.iv,
          expiry,
          new Date().toISOString(),
          input.version,
          input.accessClientId === undefined ? 0 : 1,
          input.accessClientId || null,
        )
        .run()
    : await env.DB.prepare(
        `INSERT OR IGNORE INTO security_service_identities(id,label,scope,access_client_id,key_version,ciphertext,iv,expires_at,created_by)
      VALUES(?1,?2,'ai.runner',?3,1,?4,?5,?6,?7)`,
      )
        .bind(
          input.id,
          input.label,
          input.accessClientId || null,
          sealed.ciphertext,
          sealed.iv,
          expiry,
          actor,
        )
        .run();
  if (result.meta.changes !== 1) throw new SecurityError("SERVICE_IDENTITY_CONFLICT", 409);
  await securityEvent(
    env.DB,
    request,
    input.version ? "service.key_rotated" : "service.created",
    "critical",
    actor,
    { target: input.id, version },
  );
  return { id: input.id, version, secret, expiresAt: expiry }; // Once to the authenticated owner; never listed or logged.
}

export async function revokeServiceIdentity(
  env: ServiceEnv,
  request: Request,
  actor: string,
  id: string,
) {
  await env.DB.prepare(
    "UPDATE security_service_identities SET revoked_at=COALESCE(revoked_at,?2),previous_ciphertext=NULL,previous_iv=NULL,previous_until=NULL WHERE id=?1",
  )
    .bind(id, new Date().toISOString())
    .run();
  await securityEvent(env.DB, request, "service.revoked", "critical", actor, { target: id });
}

export async function runnerCredentials(env: ServiceEnv, id: string) {
  const row = await env.DB.prepare(
    "SELECT * FROM security_service_identities WHERE id=?1 AND scope='ai.runner'",
  )
    .bind(id)
    .first<ServiceRow>();
  if (!row) {
    if (env.ALLOW_LEGACY_AI_RUNNER === "false" || !env.AI_STUDIO_RUNNER_HMAC_SECRET)
      throw new SecurityError("RUNNER_IDENTITY_NOT_CONFIGURED", 401);
    return { legacy: true, secrets: [env.AI_STUDIO_RUNNER_HMAC_SECRET], accessClientId: null };
  }
  if (row.revoked_at || Date.parse(row.expires_at) <= Date.now())
    throw new SecurityError("RUNNER_IDENTITY_REVOKED", 401);
  const secrets = [await decryptSecretValue(env, row, context(id, row.key_version))];
  if (
    row.previous_ciphertext &&
    row.previous_iv &&
    row.previous_until &&
    Date.parse(row.previous_until) > Date.now()
  )
    secrets.push(
      await decryptSecretValue(
        env,
        { ciphertext: row.previous_ciphertext, iv: row.previous_iv },
        context(id, row.key_version - 1),
      ),
    );
  return { legacy: false, secrets, accessClientId: row.access_client_id };
}
