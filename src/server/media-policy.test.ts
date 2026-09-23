import { describe, it, expect } from "vitest";
import { localMediaPreview } from "./media-policy";

describe("trusted local preview policy", () => {
  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"])(
    "allows local development at %s",
    (PUBLIC_SITE_URL) => {
      expect(localMediaPreview({ APP_ENV: "local", PUBLIC_SITE_URL })).toBe(true);
    },
  );
  it.each([
    {},
    { APP_ENV: "production", PUBLIC_SITE_URL: "http://localhost:3000" },
    { APP_ENV: "preview", PUBLIC_SITE_URL: "http://localhost:3000" },
    { APP_ENV: "local", PUBLIC_SITE_URL: "https://cutiutamagica.eu" },
    { APP_ENV: "local", PUBLIC_SITE_URL: "http://localhost.example.com" },
    { APP_ENV: "local", PUBLIC_SITE_URL: "https://localhost@external.test" },
    { APP_ENV: "local", PUBLIC_SITE_URL: "invalid" },
  ])("does not unlock untrusted environments: %j", (env) => {
    expect(localMediaPreview(env)).toBe(false);
  });
});
