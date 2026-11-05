import { readFileSync } from "node:fs";

// This ownership proof is deliberately public, as required by the IndexNow protocol.
// It grants no administrative access. Only changed canonical pages are submitted.
const origin = "https://cutiutamagica.eu";
const endpoint = "https://api.indexnow.org/indexnow";
const keyLocation = `${origin}/indexnow-ownership.txt`;
const key = readFileSync(
  new URL("../public/indexnow-ownership.txt", import.meta.url),
  "utf8",
).trim();
const options = process.argv.slice(2);
if (options.some((value) => value !== "--submit" && !value.startsWith("--paths=")))
  throw new Error("Folosește --paths=/pagina,/alta-pagina și opțional --submit.");
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error("Dovada IndexNow nu este validă.");
const paths = options
  .find((value) => value.startsWith("--paths="))
  ?.slice(8)
  .split(",")
  .filter(Boolean);
if (!paths?.length)
  throw new Error("Indică prin --paths numai paginile adăugate sau modificate în acest release.");
if (paths.some((path) => !path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)))
  throw new Error("Sunt permise numai căi canonice ale magazinului, fără parametri sau ancore.");
const urls = [...new Set(paths.map((path) => new URL(path, origin).href))];
async function get(url) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
  return { response, body: await response.text() };
}
const sitemap = await get(`${origin}/sitemap.txt`);
if (sitemap.response.status !== 200) throw new Error("Lista canonică nu poate fi verificată.");
const canonical = new Set(sitemap.body.trim().split(/\s+/));
if (urls.some((url) => !canonical.has(url)))
  throw new Error("O pagină nu aparține inventarului canonic public. Nu se trimite nimic.");
for (const url of urls) {
  const { response, body } = await get(url);
  const declared = body.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  if (
    response.status !== 200 ||
    declared !== url ||
    /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(body) ||
    response.headers.get("x-robots-tag")?.includes("noindex")
  )
    throw new Error(`Pagina nu este eligibilă pentru notificare: ${url}`);
}
const proof = await get(keyLocation);
const verificationFilePublished = proof.response.status === 200 && proof.body.trim() === key;
if (!options.includes("--submit")) {
  console.log(
    JSON.stringify({ mode: "dry-run", endpoint, verificationFilePublished, urls }, null, 2),
  );
} else {
  if (!verificationFilePublished)
    throw new Error("Publică și verifică mai întâi fișierul de proprietate IndexNow.");
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(origin).hostname, key, keyLocation, urlList: urls }),
  });
  const status = response.status;
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        endpoint,
        status,
        urlCount: urls.length,
        state:
          status === 200
            ? "received"
            : status === 202
              ? "received_key_validation_pending"
              : "rejected",
        urls,
      },
      null,
      2,
    ),
  );
  if (status !== 200 && status !== 202) process.exitCode = 1;
}
