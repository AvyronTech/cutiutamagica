/** Read a small JSON request even when Content-Length is absent or forged. */
export async function boundedJson(request: Request, limit: number): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json"))
    throw fail("JSON necesar.", 415);
  const bytes = await boundedBytes(request, limit);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw fail("JSON invalid.", 400);
  }
}
const fail = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });

export async function boundedBytes(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw fail("Cerere prea mare.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw fail("Conținut lipsă.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw fail("Cerere prea mare.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes;
}

/** Limit actual multipart bytes before the runtime allocates every field/file. */
export async function boundedFormData(request: Request, limit: number): Promise<FormData> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))
    throw fail("Formular multipart necesar.", 415);
  const bytes = await boundedBytes(request, limit);
  try {
    return await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw fail("Formular invalid.", 400);
  }
}

/** Abort an R2 upload as soon as actual bytes exceed the declared size or type limit. */
export function boundedUploadStream(body: ReadableStream<Uint8Array>, limit: number) {
  let count = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        count += chunk.byteLength;
        if (count > limit) throw fail("Fișier prea mare.", 413);
        controller.enqueue(chunk);
      },
    }),
  );
}
