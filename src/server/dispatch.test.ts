import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../server";
const handlers = vi.hoisted(() => ({
  ssr: vi.fn(
    async () =>
      new Response('<html lang="ro"><body>Magazin</body></html>', {
        headers: { "content-type": "text/html" },
      }),
  ),
  api: vi.fn(async () => Response.json({ data: { ok: true } })),
  media: vi.fn(async () => new Response("image", { headers: { "content-type": "image/webp" } })),
  guard: vi.fn(async () => null as Response | null),
}));
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: handlers.ssr } }));
vi.mock("./api/router", () => ({ handleApiRequest: handlers.api }));
vi.mock("./media-public", () => ({ handlePublicMediaRequest: handlers.media }));
vi.mock("./admin-page-guard", () => ({ guardAdminPage: handlers.guard }));
vi.mock("../lib/error-capture", () => ({ consumeLastCapturedError: () => null }));
const env = {
  APP_ENV: "production",
  DB: {},
  ANALYTICS: { writeDataPoint: vi.fn() },
} as unknown as Env;
const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
beforeEach(() => {
  vi.clearAllMocks();
  handlers.guard.mockResolvedValue(null);
});
describe("bounded worker dispatch", () => {
  it("renders public HTML without calling private API, media or admin authentication", async () => {
    const r = await worker.fetch(new Request("https://cutiutamagica.eu/livrare"), env, ctx);
    expect(r.status).toBe(200);
    expect(handlers.ssr).toHaveBeenCalledTimes(1);
    expect(handlers.api).not.toHaveBeenCalled();
    expect(handlers.media).not.toHaveBeenCalled();
    expect(handlers.guard).not.toHaveBeenCalled();
  });
  it("dispatches API and media routes and preserves an unauthenticated admin redirect", async () => {
    expect(
      (await worker.fetch(new Request("https://cutiutamagica.eu/api/v1/health"), env, ctx)).status,
    ).toBe(200);
    expect(handlers.api).toHaveBeenCalledTimes(1);
    expect(handlers.ssr).not.toHaveBeenCalled();
    expect(
      (
        await worker.fetch(new Request("https://cutiutamagica.eu/media/photo"), env, ctx)
      ).headers.get("content-type"),
    ).toBe("image/webp");
    handlers.guard.mockResolvedValue(Response.redirect("https://cutiutamagica.eu/auth", 302));
    const r = await worker.fetch(new Request("https://cutiutamagica.eu/admin/products"), env, ctx);
    expect(r.status).toBe(302);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(r.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(handlers.ssr).not.toHaveBeenCalled();
  });
  it("never allows account or checkout responses into shared caches", async () => {
    for (const path of ["/cont", "/comanda", "/auth"]) {
      const r = await worker.fetch(new Request("https://cutiutamagica.eu" + path), env, ctx);
      expect(r.headers.get("cache-control")).toBe("private, no-store");
      expect(r.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  });
});
