import { describe, expect, it } from "vitest";
import { boundedFormData, boundedUploadStream } from "../api/bounded-json";
function streamed(parts: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((p) => controller.enqueue(p));
      controller.close();
    },
  });
}
describe("upload resource limits", () => {
  it.each([undefined, "1"])(
    "rejects oversized multipart before parsing even with Content-Length %s",
    async (length) => {
      const request = new Request("https://shop.test/upload", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=test",
          ...(length ? { "content-length": length } : {}),
        },
        body: streamed([new Uint8Array(8), new Uint8Array(8)]),
        duplex: "half",
      } as RequestInit);
      await expect(boundedFormData(request, 10)).rejects.toMatchObject({ statusCode: 413 });
    },
  );
  it("preserves a valid allowed multipart file", async () => {
    const form = new FormData();
    form.set("photo", new File(["synthetic"], "test.txt"));
    const parsed = await boundedFormData(
      new Request("https://shop.test/upload", { method: "POST", body: form }),
      1000,
    );
    expect(await (parsed.get("photo") as File).text()).toBe("synthetic");
  });
  it("aborts the storage stream at the actual byte limit", async () => {
    const body = boundedUploadStream(streamed([new Uint8Array(6), new Uint8Array(6)]), 10);
    await expect(new Response(body).arrayBuffer()).rejects.toMatchObject({ statusCode: 413 });
  });
});
