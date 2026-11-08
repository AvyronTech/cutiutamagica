const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
class ResponseLimitError extends Error {}
/** Small JSON APIs only: bound headers AND body; never retry a mutation automatically. */
export async function storefrontRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 20_000);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal });
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new ResponseLimitError(
              "Răspunsul este prea mare. Solicită ajutorul echipei magazinului.",
            );
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Response(reader ? body : null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    if (error instanceof ResponseLimitError) throw error;
    if (controller.signal.aborted)
      throw new Error(
        "Răspunsul întârzie. Datele completate au fost păstrate; verifică solicitarea înainte să reîncerci.",
      );
    throw new Error("Conexiunea s-a întrerupt. Verifică accesul la internet și reîncearcă.");
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}
