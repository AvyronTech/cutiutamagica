import { describe, expect, it, vi } from "vitest";
import { handlePersonalization } from "./api/personalization";

function validForm(image: File): FormData {
  const form = new FormData();
  form.set("customerName", "Ana Pop");
  form.set("email", "ana@example.ro");
  form.set("phone", "+40 712 345 678");
  form.set("boxColor", "yellow");
  form.set("melody", "melody-2");
  form.set("giftWrap", "true");
  form.set("notes", "Cadou pentru aniversare.");
  form.set("consent", "true");
  form.set("website", "");
  form.set("image", image);
  return form;
}

function pngFile(): File {
  return new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
    "portret.png",
    { type: "image/png" },
  );
}

function mockEnv() {
  const inserted: unknown[][] = [];
  const put = vi.fn().mockResolvedValue({ key: "stored" });
  const remove = vi.fn().mockResolvedValue(undefined);
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (sql.includes("review_rate_limits")) return { count: 1 };
              return null;
            },
            async all() {
              return { results: [], success: true, meta: {} };
            },
            async run() {
              if (sql.includes("INSERT INTO personalization_requests")) inserted.push(values);
              return { success: true, meta: { changes: 1 }, results: [] };
            },
          };
        },
      };
    },
  };
  return {
    env: {
      DB: db as unknown as D1Database,
      MEDIA: { put, delete: remove } as unknown as R2Bucket,
    } as Env,
    inserted,
    put,
  };
}

describe("personalization API", () => {
  it("stores a valid private image and server-calculated request", async () => {
    const { env, inserted, put } = mockEnv();
    const response = await handlePersonalization(
      new Request("https://cutiutamagica.eu/api/v1/personalization/requests", {
        method: "POST",
        headers: { origin: "https://cutiutamagica.eu", "cf-connecting-ip": "192.0.2.5" },
        body: validForm(pngFile()),
      }),
      env,
    );

    expect(response?.status).toBe(201);
    expect(put).toHaveBeenCalledOnce();
    expect(String(put.mock.calls[0][0])).toMatch(/^private\/personalizations\//);
    expect(inserted).toHaveLength(1);
    expect(inserted[0][5]).toBe("yellow");
    expect(inserted[0][6]).toBe("melody-2");
    expect(inserted[0][10]).toBe(1);
    expect(inserted[0][11]).toBe(18_900);
    expect(inserted[0][12]).toBe(3_500);
    expect(inserted[0][13]).toBe(22_400);
  });

  it("rejects a file whose bytes do not match its declared image type", async () => {
    const { env, put } = mockEnv();
    const fake = new File([new TextEncoder().encode("not a png")], "fake.png", {
      type: "image/png",
    });
    const response = await handlePersonalization(
      new Request("https://cutiutamagica.eu/api/v1/personalization/requests", {
        method: "POST",
        headers: { origin: "https://cutiutamagica.eu" },
        body: validForm(fake),
      }),
      env,
    );

    expect(response?.status).toBe(415);
    expect(put).not.toHaveBeenCalled();
  });

  it("does not expose request history without an authenticated account", async () => {
    const { env } = mockEnv();
    const response = await handlePersonalization(
      new Request("https://cutiutamagica.eu/api/v1/personalization/requests"),
      env,
    );
    expect(response?.status).toBe(401);
  });
});
