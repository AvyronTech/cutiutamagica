import type { createRemoteJWKSet, JWTVerifyGetKey } from "jose";
import { accessRequired, securityPolicy, SecurityError, type SecurityBindings } from "./policy";

// Public signing keys only; neither JWTs nor identities are cached between requests.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export type AccessIdentity =
  | { kind: "human"; email: string; subject: string }
  | { kind: "service"; clientId: string; subject: string };

export async function verifyAccessIdentity(
  request: Request,
  env: SecurityBindings,
  allowService = false,
  testKey?: JWTVerifyGetKey,
): Promise<AccessIdentity | null> {
  if (!accessRequired(request, env)) return null;
  const domain = env.ACCESS_TEAM_DOMAIN || "";
  const audience =
    (allowService
      ? env.ACCESS_SERVICE_APPLICATION_AUD || env.ACCESS_APPLICATION_AUD
      : env.ACCESS_APPLICATION_AUD) || "";
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) ||
    !audience ||
    audience.length > 128
  )
    throw new SecurityError("ACCESS_CONFIGURATION_MISSING", 503);
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token || token.length > 16_384) throw new SecurityError("ACCESS_IDENTITY_REQUIRED");
  // The compatible/off path must not load JWT cryptography on Workers Free.
  const { createRemoteJWKSet, jwtVerify } = await import("jose");
  let keys = testKey || keySets.get(domain);
  if (!keys) {
    const remoteKeys = createRemoteJWKSet(new URL(`${domain}/cdn-cgi/access/certs`), {
      timeoutDuration: 5000,
      cooldownDuration: 30_000,
      cacheMaxAge: 600_000,
    });
    if (keySets.size >= 4) keySets.clear();
    keySets.set(domain, remoteKeys);
    keys = remoteKeys;
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer: domain,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat"],
      clockTolerance: 5,
    });
    if (typeof payload.common_name === "string") {
      if (!allowService || !securityPolicy(env).serviceClientIds.includes(payload.common_name))
        throw new SecurityError("ACCESS_SERVICE_NOT_ALLOWED");
      return {
        kind: "service",
        clientId: payload.common_name,
        subject: payload.sub || payload.common_name,
      };
    }
    if (
      typeof payload.email !== "string" ||
      !payload.email.includes("@") ||
      typeof payload.sub !== "string"
    )
      throw new SecurityError("ACCESS_HUMAN_IDENTITY_REQUIRED");
    return { kind: "human", email: payload.email.trim().toLowerCase(), subject: payload.sub };
  } catch (error) {
    if (error instanceof SecurityError) throw error;
    throw new SecurityError("ACCESS_TOKEN_INVALID");
  }
}

export async function assertAdminEdgeIdentity(
  request: Request,
  env: SecurityBindings,
  email?: string,
  testKey?: JWTVerifyGetKey,
) {
  const identity = await verifyAccessIdentity(request, env, false, testKey);
  if (identity?.kind === "human" && email && identity.email !== email.trim().toLowerCase())
    throw new SecurityError("ACCESS_ACCOUNT_MISMATCH");
  return identity;
}
