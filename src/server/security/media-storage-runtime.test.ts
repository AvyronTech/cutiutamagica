import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import ts from "typescript";
import { expect, it } from "vitest";

it("streams media into R2 with a known length and rejects oversized or truncated bodies", async () => {
  const source = await readFile(new URL("../api/bounded-json.ts", import.meta.url), "utf8");
  const helper = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const runtime = new Miniflare({
    workers: [
      {
        config: {
          name: "media-storage-regression",
          compatibilityDate: "2026-09-14",
          manifest: {
            mainModule: "worker.js",
            modulesRoot: "/",
            modules: {
              "bounded-json.js": { type: "esm", contents: helper },
              "worker.js": {
                type: "esm",
                contents: `
                import { r2UploadStream } from './bounded-json.js';
                export default { async fetch(request, env) {
                  const key = new URL(request.url).pathname;
                  if (request.method === 'GET') {
                    const object = await env.MEDIA.get(key);
                    return object ? new Response(object.body) : new Response(null, { status: 404 });
                  }
                  try {
                    const object = await env.MEDIA.put(key, r2UploadStream(request.body, 100000));
                    return Response.json({ size: object.size });
                  } catch (error) {
                    return Response.json({ error: error.name }, { status: error.statusCode ?? 400 });
                  }
                }};
              `,
              },
            },
          },
          env: { MEDIA: { type: "r2", name: "media-storage-regression" } },
        },
      },
    ],
  });
  try {
    const bytes = new Uint8Array(100000).fill(42);
    const valid = await runtime.dispatchFetch("https://test.local/valid", {
      method: "POST",
      body: bytes,
    });
    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ size: bytes.length });
    const stored = await runtime.dispatchFetch("https://test.local/valid");
    expect(new Uint8Array(await stored.arrayBuffer())).toEqual(bytes);
    for (const [key, size] of [
      ["oversized", 100001],
      ["truncated", 99999],
    ] as const) {
      const invalid = await runtime.dispatchFetch(`https://test.local/${key}`, {
        method: "POST",
        body: new Uint8Array(size),
      });
      expect(invalid.status).toBeGreaterThanOrEqual(400);
      expect((await runtime.dispatchFetch(`https://test.local/${key}`)).status).toBe(404);
    }
  } finally {
    await runtime.dispose();
  }
}, 20000);
