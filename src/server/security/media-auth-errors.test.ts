import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { handleAdminMediaApi } from "../api/admin-media";

vi.mock("@/lib/admin-auth", () => ({ authenticateAdminRequest: vi.fn() }));

const routes = [
  ["GET", "/api/v1/admin/products/product_sunshine/media"],
  ["POST", "/api/v1/admin/products/product_sunshine/media"],
  ["PATCH", "/api/v1/admin/media/media_example"],
  ["GET", "/api/v1/admin/media/media_example/content"],
  ["HEAD", "/api/v1/admin/media/media_example/content"],
  ["GET", "/api/v1/admin/documents/document_example/content"],
  ["HEAD", "/api/v1/admin/documents/document_example/content"],
] as const;

beforeEach(() => vi.clearAllMocks());

describe.each([401, 403])("media authorization response %i", (status) => {
  it.each(routes)("preserves asynchronous auth rejection for %s %s", async (method, path) => {
    vi.mocked(authenticateAdminRequest).mockRejectedValueOnce(
      Object.assign(new Error("Acces neautorizat."), { statusCode: status }),
    );
    const prepare = vi.fn();
    const get = vi.fn();
    const put = vi.fn();
    const env = { DB: { prepare }, MEDIA: { get, put } } as unknown as Env;
    const response = await handleAdminMediaApi(
      new Request(`https://shop.test${path}`, { method }),
      env,
    );
    expect(response?.status).toBe(status);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(await response?.json()).toMatchObject({
      error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" },
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});
