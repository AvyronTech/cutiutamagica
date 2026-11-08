import { describe, expect, it } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { verifyAccessIdentity, assertAdminEdgeIdentity } from "./access";
import { guardSecurityEdge, addSecurityHeaders } from "./edge";
import { assertSameOrigin, securityPolicy } from "./policy";
import type { SecurityBindings } from "./policy";

const issuer = "https://cutiuta-magica.cloudflareaccess.com";
const env = {
  ADMIN_ACCESS_MODE: "enforce",
  ACCESS_TEAM_DOMAIN: issuer,
  ACCESS_APPLICATION_AUD: "test-audience",
  ACCESS_SERVICE_CLIENT_IDS: "runner.access",
};
const keys = generateKeyPair("RS256");
async function signed(
  claims: Record<string, unknown> = {},
  options: { issuer?: string; audience?: string; expiry?: number } = {},
) {
  const { privateKey } = await keys;
  return new SignJWT({ email: "owner@example.test", ...claims })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("identity-test")
    .setIssuer(options.issuer || issuer)
    .setAudience(options.audience || "test-audience")
    .setIssuedAt()
    .setExpirationTime(options.expiry ?? Math.floor(Date.now() / 1000) + 120)
    .sign(privateKey);
}
const req = (token?: string, url = "https://app.cutiutamagica.eu/admin") =>
  new Request(url, { headers: token ? { "cf-access-jwt-assertion": token } : {} });
async function verify(token?: string, allowService = false, bindings: SecurityBindings = env) {
  return verifyAccessIdentity(
    req(token),
    bindings,
    allowService,
    async () => (await keys).publicKey,
  );
}

describe("Cloudflare Access boundary", () => {
  it("keeps human and service application audiences separate across Workers and Access applications", async () => {
    const bindings = { ...env, ACCESS_SERVICE_APPLICATION_AUD: "service-audience" };
    const service = await signed(
      { common_name: "runner.access" },
      { audience: "service-audience" },
    );
    expect(await verify(service, true, bindings)).toMatchObject({ kind: "service" });
    await expect(verify(service, false, bindings)).rejects.toMatchObject({
      code: "ACCESS_TOKEN_INVALID",
    });
    await expect(
      verify(await signed({ common_name: "runner.access" }), true, bindings),
    ).rejects.toMatchObject({ code: "ACCESS_TOKEN_INVALID" });
    expect(await verify(await signed(), false, bindings)).toMatchObject({ kind: "human" });
  });
  it("keeps existing authentication compatible until the operator enables a pilot", async () => {
    expect(await verifyAccessIdentity(req(), {})).toBeNull();
    expect(securityPolicy({}).mfa).toBe("preparation_only");
    expect(
      await verifyAccessIdentity(req(), {
        ...env,
        ADMIN_ACCESS_MODE: "pilot",
        ACCESS_PILOT_HOSTS: "",
      }),
    ).toBeNull();
  });
  it("fails closed on missing configuration or identity and rejects forged identity headers", async () => {
    await expect(
      verifyAccessIdentity(req(), { ADMIN_ACCESS_MODE: "enforce" }),
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(verify()).rejects.toMatchObject({ code: "ACCESS_IDENTITY_REQUIRED" });
    await expect(
      verifyAccessIdentity(
        new Request("https://app.cutiutamagica.eu/admin", {
          headers: { "cf-access-authenticated-user-email": "owner@example.test" },
        }),
        env,
      ),
    ).rejects.toMatchObject({ code: "ACCESS_IDENTITY_REQUIRED" });
  });
  it("validates the signed human identity, audience, issuer, expiry and signature", async () => {
    expect(await verify(await signed())).toMatchObject({
      kind: "human",
      email: "owner@example.test",
    });
    for (const options of [
      { audience: "another-app" },
      { issuer: "https://other.cloudflareaccess.com" },
      { expiry: Math.floor(Date.now() / 1000) - 60 },
    ])
      await expect(verify(await signed({}, options))).rejects.toMatchObject({
        code: "ACCESS_TOKEN_INVALID",
      });
    const token = await signed();
    await expect(verify(token.slice(0, -5) + "aaaaa")).rejects.toMatchObject({
      code: "ACCESS_TOKEN_INVALID",
    });
  });
  it("never accepts service tokens on human administration and restricts the service allowlist", async () => {
    await expect(verify(await signed({ common_name: "runner.access" }))).rejects.toMatchObject({
      code: "ACCESS_SERVICE_NOT_ALLOWED",
    });
    expect(await verify(await signed({ common_name: "runner.access" }), true)).toMatchObject({
      kind: "service",
      clientId: "runner.access",
    });
    await expect(
      verify(await signed({ common_name: "unknown.access" }), true),
    ).rejects.toMatchObject({ code: "ACCESS_SERVICE_NOT_ALLOWED" });
  });
  it("binds the verified Access identity to the existing shop account", async () => {
    const request = req(await signed());
    const key = async () => (await keys).publicKey;
    await expect(
      assertAdminEdgeIdentity(request, env, "another@example.test", key),
    ).rejects.toMatchObject({ code: "ACCESS_ACCOUNT_MISMATCH" });
    await expect(
      assertAdminEdgeIdentity(request, env, " OWNER@example.test ", key),
    ).resolves.toMatchObject({ kind: "human" });
  });
  it("requires timestamps and rejects symmetric algorithms even with a matching audience", async () => {
    const { privateKey } = await keys;
    const token = (withIat: boolean) => {
      let value = new SignJWT({ email: "owner@example.test" })
        .setProtectedHeader({ alg: "RS256" })
        .setSubject("test")
        .setIssuer(issuer)
        .setAudience("test-audience");
      value = withIat ? value.setIssuedAt() : value.setExpirationTime("2m");
      return value.sign(privateKey);
    };
    await expect(verify(await token(true))).rejects.toMatchObject({ code: "ACCESS_TOKEN_INVALID" });
    await expect(verify(await token(false))).rejects.toMatchObject({
      code: "ACCESS_TOKEN_INVALID",
    });
    const symmetric = await new SignJWT({ email: "owner@example.test" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(issuer)
      .setAudience("test-audience")
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(new Uint8Array(32));
    await expect(verify(symmetric)).rejects.toMatchObject({ code: "ACCESS_TOKEN_INVALID" });
  });
  it("requires an actual human identity and cannot obtain permissions from a JWT", async () => {
    await expect(verify(await signed({ email: null }))).rejects.toMatchObject({
      code: "ACCESS_HUMAN_IDENTITY_REQUIRED",
    });
    const identity = await verify(await signed({ roles: ["owner"], permissions: ["team.write"] }));
    expect(identity).not.toHaveProperty("permissions");
    // The email comparison is independent from the JWT verifier; off mode has no asserted identity.
    expect(await assertAdminEdgeIdentity(req(), {}, "unchanged@example.test")).toBeNull();
  });
});

describe("edge policies preserve public flows", () => {
  it("rejects encoded or double-encoded private prefixes before router normalization", async () => {
    for (const path of [
      "/%61dmin/orders",
      "/%2561dmin/orders",
      "//admin/orders",
      "/api/v1/%61dmin/security",
      "/admin%2Forders",
    ])
      await expect(
        guardSecurityEdge(req(undefined, "https://app.cutiutamagica.eu" + path), {}),
      ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("blocks alternative origins in production, including workers.dev", async () => {
    for (const host of ["cutiuta-magica-store.example.workers.dev", "old.example.test"])
      await expect(
        guardSecurityEdge(req(undefined, `https://${host}/api/v1/health`), {
          APP_ENV: "production",
        }),
      ).rejects.toMatchObject({ statusCode: 421 });
    expect(
      await guardSecurityEdge(req(undefined, "https://cutiutamagica.eu/api/v1/products"), {
        APP_ENV: "production",
      }),
    ).toBeNull();
  });
  it("preserves only exact legacy payment POST callbacks without opening admin or preview origins", async () => {
    const host = "https://cutiuta-magica-store.avyrontech.workers.dev";
    for (const path of ["/api/v1/webhooks/stripe", "/api/v1/webhooks/revolut"])
      expect(
        await guardSecurityEdge(new Request(host + path, { method: "POST" }), {
          APP_ENV: "production",
        }),
      ).toBeNull();
    for (const [origin, path, method] of [
      [host, "/api/v1/webhooks/stripe", "GET"],
      [host, "/api/v1/admin/security", "POST"],
      [host, "/api/v1/payments/checkout", "POST"],
      [host, "/api/v1/health", "GET"],
      [host, "/", "GET"],
      [
        "https://preview-cutiuta-magica-store.avyrontech.workers.dev",
        "/api/v1/webhooks/stripe",
        "POST",
      ],
      [host + ":8443", "/api/v1/webhooks/stripe", "POST"],
    ])
      await expect(
        guardSecurityEdge(new Request(origin + path, { method }), { APP_ENV: "production" }),
      ).rejects.toMatchObject({ statusCode: 421 });
  });
  it("rejects private cross-origin mutations, allows same-origin, and leaves signed webhooks untouched", async () => {
    await expect(
      guardSecurityEdge(
        new Request("https://app.cutiutamagica.eu/api/v1/admin/security/sessions", {
          method: "POST",
        }),
        {},
      ),
    ).rejects.toMatchObject({ code: "ORIGIN_NOT_ALLOWED" });
    expect(
      await guardSecurityEdge(
        new Request("https://app.cutiutamagica.eu/api/v1/admin/security/sessions", {
          method: "POST",
          headers: { origin: "https://app.cutiutamagica.eu" },
        }),
        {},
      ),
    ).toBeNull();
    expect(
      await guardSecurityEdge(
        new Request("https://cutiutamagica.eu/api/v1/webhooks/stripe", { method: "POST" }),
        {},
      ),
    ).toBeNull();
    expect(
      await guardSecurityEdge(
        new Request("https://cutiutamagica.eu/api/v1/reviewer/apple/callback", { method: "POST" }),
        {},
      ),
    ).toBeNull();
  });
  it("does not allow a foreign CORS preflight or a false same-origin browser context", async () => {
    await expect(
      guardSecurityEdge(
        new Request("https://app.cutiutamagica.eu/api/v1/admin/security", {
          method: "OPTIONS",
          headers: { origin: "https://attacker.test" },
        }),
        {},
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(() =>
      assertSameOrigin(
        new Request("https://app.cutiutamagica.eu/", {
          headers: { origin: "https://app.cutiutamagica.eu", "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toThrow();
  });
  it("supports a dedicated hostname without duplicating the application and rejects invalid config", async () => {
    const response = await guardSecurityEdge(
      req(undefined, "https://cutiutamagica.eu/admin/orders"),
      { ADMIN_HOST_MODE: "dedicated", ADMIN_HOSTNAME: "admin.cutiutamagica.eu" },
    );
    expect(response?.headers.get("location")).toBe("https://admin.cutiutamagica.eu/admin/orders");
    expect(() => securityPolicy({ ADMIN_HOSTNAME: "attacker.test/path" })).toThrow();
    expect(() =>
      securityPolicy({ ADMIN_ACCESS_MODE: "pilot", ACCESS_PILOT_HOSTS: "cutiutamagica.eu" }),
    ).toThrow();
  });
  it("keeps cookie-bearing responses private and adds a compatible active CSP baseline", () => {
    const headers = new Headers({
      "content-type": "text/html",
      "set-cookie": "session=opaque; Secure; HttpOnly",
    });
    addSecurityHeaders(headers, new Response(), req());
    expect(headers.get("cache-control")).toBe("private, no-store");
    expect(headers.get("content-security-policy")).toContain("object-src 'none'");
    expect(headers.has("content-security-policy-report-only")).toBe(false);
  });
});
