const origin = process.env.SEO_AUDIT_ORIGIN || "https://cutiutamagica.eu";
const site = new URL(origin);
const problems = [];
const sitemapPaths = ["/sitemap-core.xml", "/sitemap-products.xml", "/sitemap-guides.xml"];

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "CutiutaMagica-SEO-Audit/1.0" },
    ...options,
  });
  return { response, body: options.method === "HEAD" ? "" : await response.text() };
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].replaceAll("&amp;", "&"),
  );
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] || "";
}

function meta(html, field, name) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .find((tag) => attribute(tag, field).toLowerCase() === name.toLowerCase());
}

function link(html, rel) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .find((tag) => attribute(tag, "rel").toLowerCase() === rel);
}

async function main() {
  const resources = new Map();
  for (const path of [
    "/robots.txt",
    "/sitemap.xml",
    ...sitemapPaths,
    "/sitemap.txt",
    "/llms.txt",
    "/google-products.xml",
  ]) {
    const { response, body } = await request(new URL(path, site));
    resources.set(path, body);
    if (response.status !== 200) problems.push(`${path}: HTTP ${response.status}`);
  }

  const index = locs(resources.get("/sitemap.xml"));
  const expectedChildren = sitemapPaths.map((path) => new URL(path, site).href);
  if (
    index.length !== expectedChildren.length ||
    expectedChildren.some((url) => !index.includes(url))
  ) {
    problems.push("Indexul XML nu conține exact cele trei sitemapuri copil.");
  }

  const xmlUrls = sitemapPaths.flatMap((path) => locs(resources.get(path)));
  const textUrls = resources.get("/sitemap.txt").trim().split(/\s+/).filter(Boolean);
  const uniqueUrls = [...new Set(xmlUrls)];
  if (uniqueUrls.length !== xmlUrls.length)
    problems.push("Sitemapurile XML conțin URL-uri duplicate.");
  if (
    new Set(textUrls).size !== textUrls.length ||
    uniqueUrls.length !== textUrls.length ||
    uniqueUrls.some((url) => !textUrls.includes(url))
  ) {
    problems.push("Lista text diferă de sitemapurile XML.");
  }

  const robots = resources.get("/robots.txt");
  for (const path of ["/sitemap.xml", "/sitemap.txt"]) {
    if (!robots.includes(`Sitemap: ${new URL(path, site).href}`)) {
      problems.push(`robots.txt nu declară ${path}.`);
    }
  }

  const titles = new Map();
  const descriptions = new Map();
  const productUrls = uniqueUrls.filter((url) =>
    new URL(url).pathname.startsWith("/produs-cutiuta-muzicala-"),
  );
  const pages = await Promise.all(
    uniqueUrls.map(async (url) => {
      const { response, body } = await request(url);
      const canonical = attribute(link(body, "canonical") || "", "href");
      const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
      const description = attribute(meta(body, "name", "description") || "", "content");
      const robotsMeta = attribute(meta(body, "name", "robots") || "", "content");
      const image = attribute(meta(body, "property", "og:image") || "", "content");
      const product = productUrls.includes(url);
      if (response.status !== 200 || response.url !== url)
        problems.push(`${url}: HTTP ${response.status}, final ${response.url}`);
      if (canonical !== url) problems.push(`${url}: canonical diferit sau absent.`);
      if (!title || !description || !/<h1\b/i.test(body))
        problems.push(`${url}: title, description sau H1 absent.`);
      if (
        !robotsMeta.includes("index") ||
        robotsMeta.includes("noindex") ||
        response.headers.get("x-robots-tag")?.includes("noindex")
      ) {
        problems.push(`${url}: noindex sau robots meta absent.`);
      }
      if (!image) problems.push(`${url}: imagine socială absentă.`);
      if (
        product &&
        (!/"@type"\s*:\s*"Product"/.test(body) || !/"@type"\s*:\s*"Offer"/.test(body))
      ) {
        problems.push(`${url}: date structurate Product/Offer absente.`);
      }
      if (title) titles.set(title, (titles.get(title) || 0) + 1);
      if (description) descriptions.set(description, (descriptions.get(description) || 0) + 1);
      return { url, body };
    }),
  );
  if ([...titles.values()].some((count) => count > 1)) problems.push("Titluri SEO duplicate.");
  if ([...descriptions.values()].some((count) => count > 1))
    problems.push("Descrieri SEO duplicate.");

  const images = [
    ...new Set(
      sitemapPaths.flatMap((path) =>
        [...resources.get(path).matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) =>
          match[1].replaceAll("&amp;", "&"),
        ),
      ),
    ),
  ];
  await Promise.all(
    images.map(async (url) => {
      const { response } = await request(url, { method: "HEAD" });
      if (response.status !== 200 || !response.headers.get("content-type")?.startsWith("image/")) {
        problems.push(`${url}: imagine indisponibilă sau tip invalid (${response.status}).`);
      }
    }),
  );

  const feed = resources.get("/google-products.xml");
  const feedLinks = [...feed.matchAll(/<g:link>([^<]+)<\/g:link>/g)].map((match) => match[1]);
  if (!feedLinks.length || feedLinks.some((url) => !productUrls.includes(url))) {
    problems.push("Feedul Merchant este gol sau conține produse în afara sitemapului.");
  }
  if (!resources.get("/llms.txt").includes("/sitemap.txt")) {
    problems.push("llms.txt nu indică lista canonică text.");
  }

  const linked = new Set();
  for (const page of pages) {
    for (const match of page.body.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
      try {
        const url = new URL(match[1], page.url);
        if (url.origin === site.origin) linked.add(url.origin + url.pathname);
      } catch {
        /* Ignore malformed external links here. */
      }
    }
  }
  const orphanPages = uniqueUrls.filter((url) => url !== site.origin + "/" && !linked.has(url));
  if (orphanPages.length)
    problems.push(`Pagini din sitemap fără legături interne: ${orphanPages.join(", ")}`);

  console.log(
    JSON.stringify(
      {
        origin: site.origin,
        sitemapUrls: uniqueUrls.length,
        products: productUrls.length,
        merchantProducts: feedLinks.length,
        images: images.length,
        orphanPages: orphanPages.length,
        problems,
      },
      null,
      2,
    ),
  );
  if (problems.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
