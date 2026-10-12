import { afterEach, describe, expect, it, vi } from "vitest";
import { handleAdminAiStudioApi } from "./admin-ai-studio";

vi.mock("@/lib/admin-auth", () => ({
  authenticateAdminRequest: vi.fn(async () => ({ id: "admin-test" })),
}));

afterEach(() => vi.restoreAllMocks());

describe("AI studio API error boundary", () => {
  it("does not expose internal database errors in the response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleAdminAiStudioApi(
      new Request("https://store.example/api/v1/admin/ai-studio"),
      {
        DB: {
          prepare() {
            throw new Error("D1 private schema and connection detail");
          },
        },
      } as unknown as Env,
    );
    expect(response?.status).toBe(500);
    const body = await response!.text();
    expect(body).toContain("Operația AI nu este disponibilă momentan");
    expect(body).not.toContain("D1 private");
  });
});
