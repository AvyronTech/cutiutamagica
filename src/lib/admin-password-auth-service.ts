export const ADMIN_SESSION_COOKIE = "cm_admin_session";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
export const ADMIN_PASSWORD_ITERATIONS = 600_000;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const DUMMY_SALT = "4Vk6ZnrF2ngv7LwCT+5IEQ==";
const DUMMY_HASH = "AM/z07Huh7iEDUoVjoQ18nPUvHRnNj/DdY5+c/iUc1g=";

export type AdminOnboardingStatus = "pending" | "profile_required" | "complete";

export interface PasswordAdminIdentity {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  onboardingStatus: AdminOnboardingStatus;
  mustChangePassword: boolean;
  sessionId: string;
}

interface CredentialRow {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  onboarding_status: AdminOnboardingStatus;
  password_hash: string;
  password_salt: string;
  iterations: number;
  password_version: number;
  must_change_password: number;
  failed_attempts: number;
  locked_until: string | null;
  is_locked: number;
  roles: string | null;
  permissions: string | null;
}

interface SessionRow extends CredentialRow {
  session_id: string;
  expires_at: string;
}

export class AdminAuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AdminAuthError";
    this.statusCode = statusCode;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBase64(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

async function derivePasswordHash(
  password: string,
  salt: string,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      iterations,
    },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function equalHash(left: string, right: string): boolean {
  const a = base64ToBytes(left);
  const b = base64ToBytes(right);
  if (a.byteLength !== b.byteLength) return false;
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (first: ArrayBufferView, second: ArrayBufferView) => boolean;
  };
  if (typeof subtle.timingSafeEqual === "function") {
    return subtle.timingSafeEqual(a, b);
  }
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

function csv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function identity(row: CredentialRow, sessionId: string): PasswordAdminIdentity {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email,
    roles: csv(row.roles),
    permissions: csv(row.permissions),
    onboardingStatus: row.onboarding_status,
    mustChangePassword: row.must_change_password === 1,
    sessionId,
  };
}

function credentialQuery(from: string, where: string, extraColumns = ""): string {
  return `
    SELECT
      ${extraColumns}au.id, au.email, au.display_name, au.status, au.onboarding_status,
      apc.password_hash, apc.password_salt, apc.iterations, apc.password_version,
      apc.must_change_password, apc.failed_attempts, apc.locked_until,
      CASE WHEN apc.locked_until IS NOT NULL AND datetime(apc.locked_until) > datetime('now')
        THEN 1 ELSE 0 END AS is_locked,
      group_concat(DISTINCT r.code) AS roles,
      group_concat(DISTINCT p.code) AS permissions
    FROM ${from}
    INNER JOIN admin_password_credentials apc ON apc.admin_user_id = au.id
    LEFT JOIN admin_user_roles aur ON aur.admin_user_id = au.id
    LEFT JOIN roles r ON r.id = aur.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE ${where}
    GROUP BY au.id
  `;
}

async function eventMetadata(email: string, request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const agent = request.headers.get("user-agent") || "unknown";
  return {
    emailHash: await sha256(email),
    ipHash: await sha256(ip.split(",")[0].trim()),
    userAgentHash: await sha256(agent.slice(0, 512)),
  };
}

async function recordLoginEvent(
  db: D1Database,
  metadata: Awaited<ReturnType<typeof eventMetadata>>,
  outcome: "success" | "invalid" | "locked" | "logout" | "password_changed",
  adminUserId?: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_login_events (
        id, admin_user_id, email_hash, ip_hash, outcome, user_agent_hash
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      crypto.randomUUID(),
      adminUserId || null,
      metadata.emailHash,
      metadata.ipHash,
      outcome,
      metadata.userAgentHash,
    )
    .run();
}

async function createSession(
  db: D1Database,
  adminUserId: string,
  passwordVersion: number,
): Promise<{ id: string; token: string }> {
  const id = crypto.randomUUID();
  const token = randomBase64(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000).toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         WHERE admin_user_id = ?1 AND (expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') OR id IN (
           SELECT id FROM admin_sessions WHERE admin_user_id = ?1 AND revoked_at IS NULL
           ORDER BY created_at DESC LIMIT -1 OFFSET 4
         ))`,
      )
      .bind(adminUserId),
    db
      .prepare(
        `INSERT INTO admin_sessions (
          id, admin_user_id, token_hash, password_version, expires_at
        ) VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(id, adminUserId, tokenHash, passwordVersion, expiresAt),
  ]);
  return { id, token };
}

export function readAdminSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === ADMIN_SESSION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function loginAdminWithPassword(
  db: D1Database,
  request: Request,
  rawEmail: string,
  password: string,
): Promise<{ token: string; admin: PasswordAdminIdentity }> {
  const email = rawEmail.trim().toLowerCase();
  const metadata = await eventMetadata(email, request);
  const recentFailures = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM admin_login_events
       WHERE outcome IN ('invalid', 'locked')
         AND (email_hash = ?1 OR ip_hash = ?2)
         AND datetime(created_at) > datetime('now', '-15 minutes')`,
    )
    .bind(metadata.emailHash, metadata.ipHash)
    .first<{ count: number }>();
  if (Number(recentFailures?.count || 0) >= 10) {
    throw new AdminAuthError("Prea multe încercări. Reîncearcă peste 15 minute.", 429);
  }

  const row = await db
    .prepare(credentialQuery("admin_users au", "au.email = ?1 COLLATE NOCASE"))
    .bind(email)
    .first<CredentialRow>();
  const derived = await derivePasswordHash(
    password,
    row?.password_salt || DUMMY_SALT,
    row?.iterations || ADMIN_PASSWORD_ITERATIONS,
  );
  const valid = Boolean(row && equalHash(derived, row.password_hash));
  const locked = row?.is_locked === 1;

  if (
    !row ||
    !valid ||
    row.status === "suspended" ||
    locked ||
    !row.roles?.split(",").includes("owner")
  ) {
    if (row && !locked) {
      await db
        .prepare(
          `UPDATE admin_password_credentials
           SET failed_attempts = failed_attempts + 1,
               locked_until = CASE WHEN failed_attempts + 1 >= ?1
                 THEN datetime('now', '+' || ?2 || ' minutes') ELSE locked_until END,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE admin_user_id = ?3`,
        )
        .bind(MAX_FAILED_ATTEMPTS, LOCK_MINUTES, row.id)
        .run();
    }
    await recordLoginEvent(db, metadata, locked ? "locked" : "invalid", row?.id);
    throw new AdminAuthError("Adresa sau parola nu este corectă.", 401);
  }

  const session = await createSession(db, row.id, row.password_version);
  await db.batch([
    db
      .prepare(
        `UPDATE admin_password_credentials
         SET failed_attempts = 0, locked_until = NULL,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE admin_user_id = ?1`,
      )
      .bind(row.id),
    db
      .prepare(
        `UPDATE admin_users
         SET status = 'active', last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1`,
      )
      .bind(row.id),
    db.prepare(
      `DELETE FROM admin_login_events
         WHERE datetime(created_at) < datetime('now', '-90 days')`,
    ),
  ]);
  await recordLoginEvent(db, metadata, "success", row.id);
  return { token: session.token, admin: identity(row, session.id) };
}

export async function authenticateAdminSession(
  db: D1Database,
  request: Request,
): Promise<PasswordAdminIdentity> {
  const token = readAdminSessionToken(request);
  if (!token) throw new AdminAuthError("Autentificarea este necesară.", 401);
  const tokenHash = await sha256(token);
  const row = await db
    .prepare(
      credentialQuery(
        "admin_sessions s INNER JOIN admin_users au ON au.id = s.admin_user_id",
        "s.token_hash = ?1 AND s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now') AND s.password_version = apc.password_version",
        "s.id AS session_id, s.expires_at, ",
      ),
    )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row || row.status !== "active") {
    throw new AdminAuthError("Sesiunea a expirat. Autentifică-te din nou.", 401);
  }
  return identity(row, row.session_id);
}

export async function changeAdminPassword(
  db: D1Database,
  request: Request,
  admin: PasswordAdminIdentity,
  newPassword: string,
): Promise<{ token: string; admin: PasswordAdminIdentity }> {
  if (
    newPassword.length < 12 ||
    newPassword.length > 128 ||
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/\d/.test(newPassword) ||
    newPassword === "Magic123"
  ) {
    throw new AdminAuthError(
      "Folosește minimum 12 caractere, cu literă mare, literă mică și cifră.",
      400,
    );
  }
  const salt = randomBase64(16);
  const hash = await derivePasswordHash(newPassword, salt, ADMIN_PASSWORD_ITERATIONS);
  const credential = await db
    .prepare(`SELECT password_version FROM admin_password_credentials WHERE admin_user_id = ?1`)
    .bind(admin.id)
    .first<{ password_version: number }>();
  if (!credential) throw new AdminAuthError("Contul administrativ nu este disponibil.", 403);
  const passwordVersion = credential.password_version + 1;
  await db.batch([
    db
      .prepare(
        `UPDATE admin_password_credentials
         SET password_hash = ?1, password_salt = ?2, iterations = ?3,
             password_version = ?4, must_change_password = 0,
             failed_attempts = 0, locked_until = NULL,
             password_changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE admin_user_id = ?5`,
      )
      .bind(hash, salt, ADMIN_PASSWORD_ITERATIONS, passwordVersion, admin.id),
    db
      .prepare(
        `UPDATE admin_sessions SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE admin_user_id = ?1 AND revoked_at IS NULL`,
      )
      .bind(admin.id),
    db
      .prepare(
        `UPDATE admin_users SET onboarding_status = 'complete',
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`,
      )
      .bind(admin.id),
  ]);
  const session = await createSession(db, admin.id, passwordVersion);
  const metadata = await eventMetadata(admin.email, request);
  await recordLoginEvent(db, metadata, "password_changed", admin.id);
  return {
    token: session.token,
    admin: {
      ...admin,
      onboardingStatus: "complete",
      mustChangePassword: false,
      sessionId: session.id,
    },
  };
}

export async function revokeAdminSession(
  db: D1Database,
  request: Request,
  admin: PasswordAdminIdentity,
): Promise<void> {
  await db
    .prepare(
      `UPDATE admin_sessions SET revoked_at = COALESCE(revoked_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       WHERE id = ?1 AND admin_user_id = ?2`,
    )
    .bind(admin.sessionId, admin.id)
    .run();
  await recordLoginEvent(db, await eventMetadata(admin.email, request), "logout", admin.id);
}

export const __adminAuthInternals = {
  derivePasswordHash,
  sha256,
};
