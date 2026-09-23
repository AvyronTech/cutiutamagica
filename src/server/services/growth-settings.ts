import { z } from "zod";
import type { CredentialProvider } from "@/lib/growth-contracts";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

export async function readSetting<S extends z.ZodTypeAny>(
  db: D1Database,
  key: string,
  schema: S,
): Promise<z.output<S>> {
  const row = await db
    .prepare("SELECT value_json FROM operational_settings WHERE key=?1")
    .bind(key)
    .first<{ value_json: string }>();
  return schema.parse(row ? JSON.parse(row.value_json) : {});
}
export async function saveSetting(db: D1Database, key: string, value: unknown, actor: string) {
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO operational_settings(key,value_json,updated_by,updated_at) VALUES(?1,?2,?3,?4)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,version=version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      )
      .bind(key, JSON.stringify(value), actor, now),
    activity(db, actor, "settings.saved", key, now),
  ]);
}
export function activity(
  db: D1Database,
  actor: string | null,
  action: string,
  entity: string,
  now = new Date().toISOString(),
) {
  return db
    .prepare(
      "INSERT INTO business_activity(id,actor_id,action,entity_id,created_at) VALUES(?1,?2,?3,?4,?5)",
    )
    .bind(crypto.randomUUID(), actor, action, entity, now);
}
const secretNames = {
  google_merchant: "GOOGLE_MERCHANT_ACCESS_TOKEN",
  netopia: "NETOPIA_API_KEY",
  netopia_public_key: "NETOPIA_PUBLIC_KEY",
  revolut_merchant: "REVOLUT_MERCHANT_SECRET_KEY",
  revolut_merchant_webhook: "REVOLUT_MERCHANT_WEBHOOK_SECRET",
  oblio: "OBLIO_CLIENT_SECRET",
  emag: "EMAG_API_CREDENTIALS",
  trendyol: "TRENDYOL_API_CREDENTIALS",
  olx: "OLX_ACCESS_TOKEN",
  okazii: "OKAZII_API_KEY",
  fgo: "FGO_PRIVATE_KEY",
  smartship: "SMARTSHIP_API_KEY",
  stripe: "STRIPE_SECRET_KEY",
  stripe_webhook: "STRIPE_WEBHOOK_SECRET",
  revolut: "REVOLUT_API_KEY",
  resend: "RESEND_API_KEY",
  brave: "BRAVE_SEARCH_API_KEY",
  google: "GOOGLE_ACCESS_TOKEN",
  meta: "META_ACCESS_TOKEN",
} as const;

const providerAliases: Partial<Record<CredentialProvider, string>> = {
  stripe_webhook: "stripe",
  revolut: "revolut_business",
};

function providerCode(provider: CredentialProvider): string {
  return providerAliases[provider] ?? provider;
}
function bytes(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
function base64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}
async function encryptionKey(env: CommerceEnv) {
  if (!env.INTEGRATION_ENCRYPTION_KEY)
    throw new Error(
      "Configurează INTEGRATION_ENCRYPTION_KEY (32 octeți în Base64) în Cloudflare pentru stocarea securizată a cheilor.",
    );
  const key = bytes(env.INTEGRATION_ENCRYPTION_KEY);
  if (key.length !== 32) throw new Error("Cheia de criptare trebuie să aibă 32 octeți.");
  return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function credential(
  env: CommerceEnv,
  provider: CredentialProvider,
): Promise<string | null> {
  const row = await env.DB.prepare(
    "SELECT ciphertext,iv FROM integration_credentials WHERE provider=?1",
  )
    .bind(provider)
    .first<{ ciphertext: string; iv: string }>();
  if (!row) return env[secretNames[provider]] || null;
  const value = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes(row.iv), additionalData: new TextEncoder().encode(provider) },
    await encryptionKey(env),
    bytes(row.ciphertext),
  );
  return new TextDecoder().decode(value);
}
export async function storeCredential(
  env: CommerceEnv,
  provider: CredentialProvider,
  value: string,
  actor: string,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(provider) },
    await encryptionKey(env),
    new TextEncoder().encode(value),
  );
  const now = new Date().toISOString();
  const providerName = providerCode(provider);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO integration_credentials(provider,ciphertext,iv,updated_by,updated_at) VALUES(?1,?2,?3,?4,?5)
      ON CONFLICT(provider) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,updated_by=excluded.updated_by,updated_at=excluded.updated_at,checked_at=NULL,check_status='unverified'`,
    ).bind(provider, base64(new Uint8Array(encrypted)), base64(iv), actor, now),
    activity(env.DB, actor, "credential.replaced", provider, now),
    env.DB.prepare(
      `UPDATE provider_configurations
       SET status = CASE WHEN status = 'disabled' THEN status ELSE 'ready_for_test' END,
           last_error_code = NULL, last_error_message = NULL, updated_at = ?2
       WHERE provider = ?1`,
    ).bind(providerName, now),
    env.DB.prepare(
      `UPDATE financial_accounts
       SET status = CASE WHEN status = 'disabled' THEN status ELSE 'setup_required' END,
           updated_at = ?2 WHERE provider = ?1`,
    ).bind(providerName, now),
    env.DB.prepare(
      `UPDATE delivery_provider_accounts
       SET status = CASE WHEN status = 'disabled' THEN status ELSE 'setup_required' END,
           updated_at = ?2 WHERE provider = ?1`,
    ).bind(providerName, now),
    env.DB.prepare(
      `UPDATE connector_secret_refs
       SET status = 'configured', last_verified_at = NULL, updated_at = ?2
       WHERE provider = ?1`,
    ).bind(providerName, now),
  ]);
}
export async function credentialStatuses(env: CommerceEnv) {
  const rows = await env.DB.prepare(
    "SELECT provider,checked_at,check_status FROM integration_credentials",
  ).all<{ provider: string; checked_at: string | null; check_status: string }>();
  return Object.entries(secretNames).map(([provider, name]) => {
    const row = rows.results.find((r) => r.provider === provider);
    return {
      provider: provider as CredentialProvider,
      configured: Boolean(row || env[name]),
      checkedAt: row?.checked_at ?? null,
      status: row?.check_status ?? "unverified",
    };
  });
}
