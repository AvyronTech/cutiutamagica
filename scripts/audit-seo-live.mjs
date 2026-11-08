const origin = process.env.SEO_AUDIT_ORIGIN || "https://cutiutamagica.eu";
const site = new URL(origin);
const problems = [];
const sitemapPaths = ["/sitemap-core.xml", "/sitemap-products.xml", "/sitemap-guides.xml"];

// Keep the audit from sending the whole catalog to the Free Worker at once.
async function mapLimited(values, run) {
  const results = new Array(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, values.length) }, async () => {
      while (next < values.length) {
        const index = next++;
        results[index] = await run(values[index]);
      }
    }),
  );
  return results;
}

function structuredData(html, url) {
  const nodes = [];
  for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attribute(attributes, "type") !== "application/ld+json") continue;
    try {
      const parsed = JSON.parse(content);
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        nodes.push(node);
        if (Array.isArray(node?.["@graph"])) nodes.push(...node["@graph"]);
      }
    } catch {
      problems.push(`${url}: JSON-LD invalid.`);
    }
  }
  return nodes;
}

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
  for (const path of [...sitemapPaths, "/sitemap.txt"]) {
    if (!robots.includes(`Sitemap: ${new URL(path, site).href}`)) {
      problems.push(`robots.txt nu declară ${path}.`);
    }
  }

  const iconPaths = [
    "/favicon.ico",
    "/favicon.svg",
    "/favicon-16.png",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-512-maskable.png",
  ];
  await mapLimited(iconPaths, async (path) => {
    const { response } = await request(new URL(path, site), { method: "HEAD" });
    if (response.status !== 200 || !response.headers.get("content-type")?.startsWith("image/"))
      problems.push(`${path}: icon indisponibil sau tip invalid.`);
  });
  const manifest = await request(new URL("/manifest.webmanifest", site));
  try {
    const data = JSON.parse(manifest.body);
    if (
      manifest.response.status !== 200 ||
      data.lang !== "ro" ||
      !data.icons?.some((i) => i.sizes === "192x192") ||
      !data.icons?.some((i) => i.sizes === "512x512")
    )
      problems.push("Manifest PWA incomplet.");
  } catch {
    problems.push("Manifest PWA invalid.");
  }
  const titles = new Map();
  const descriptions = new Map();
  const productUrls = uniqueUrls.filter((url) =>
    new URL(url).pathname.startsWith("/produs-cutiuta-muzicala-"),
  );
  const pages = await mapLimited(uniqueUrls, async (url) => {
    const { response, body } = await request(url);
    const canonical = attribute(link(body, "canonical") || "", "href");
    const title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
    const description = attribute(meta(body, "name", "description") || "", "content");
    const robotsMeta = attribute(meta(body, "name", "robots") || "", "content");
    const image = attribute(meta(body, "property", "og:image") || "", "content");
    const product = productUrls.includes(url);
    const nodes = structuredData(body, url);
    const productData = nodes.find((node) => node?.["@type"] === "Product");
    if (response.status !== 200 || response.url !== url)
      problems.push(`${url}: HTTP ${response.status}, final ${response.url}`);
    if (canonical !== url) problems.push(`${url}: canonical diferit sau absent.`);
    if (!title || !description || !/<h1\b/i.test(body))
      problems.push(`${url}: title, description sau H1 absent.`);
    if ((body.match(/<h1\b/gi) || []).length !== 1)
      problems.push(`${url}: pagina trebuie să aibă un singur H1.`);
    if (!response.headers.get("content-type")?.includes("text/html"))
      problems.push(`${url}: tipul răspunsului nu este HTML.`);
    if (!/^ro(?:-|$)/i.test(attribute(body.match(/<html\b[^>]*>/i)?.[0] || "", "lang")))
      problems.push(`${url}: limba română nu este declarată.`);
    if (
      !robotsMeta.includes("index") ||
      robotsMeta.includes("noindex") ||
      response.headers.get("x-robots-tag")?.includes("noindex")
    ) {
      problems.push(`${url}: noindex sau robots meta absent.`);
    }
    if (!image) problems.push(`${url}: imagine socială absentă.`);
    for (const [field, name] of [
      ["property", "og:title"],
      ["property", "og:description"],
      ["property", "og:url"],
      ["property", "og:type"],
      ["property", "og:image:alt"],
      ["name", "twitter:card"],
      ["name", "twitter:title"],
      ["name", "twitter:description"],
      ["name", "twitter:image"],
      ["name", "twitter:image:alt"],
    ]) {
      if (!attribute(meta(body, field, name) || "", "content"))
        problems.push(`${url}: ${name} absent.`);
    }
    if (attribute(meta(body, "property", "og:url") || "", "content") !== canonical)
      problems.push(`${url}: og:url diferit de canonical.`);
    if (attribute(meta(body, "name", "twitter:image") || "", "content") !== image)
      problems.push(`${url}: imagine Twitter diferită de OG.`);
    for (const [img] of body.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\balt\s*=/.test(img)) problems.push(`${url}: imagine fără atribut alt.`);
    }
    if (product && (!productData || productData.offers?.["@type"] !== "Offer")) {
      problems.push(`${url}: date structurate Product/Offer absente.`);
    }
    if (
      productData?.offers &&
      (!(Number(productData.offers.price) > 0) || productData.offers.url !== url)
    )
      problems.push(`${url}: preț sau URL Offer invalid.`);
    if (title) titles.set(title, (titles.get(title) || 0) + 1);
    if (description) descriptions.set(description, (descriptions.get(description) || 0) + 1);
    return { url, body, productData, socialImage: image };
  });
  if ([...titles.values()].some((count) => count > 1)) problems.push("Titluri SEO duplicate.");
  if ([...descriptions.values()].some((count) => count > 1))
    problems.push("Descrieri SEO duplicate.");

  const images = [
    ...new Set([
      ...pages.map((p) => p.socialImage).filter(Boolean),
      ...sitemapPaths.flatMap((path) =>
        [...resources.get(path).matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) =>
          match[1].replaceAll("&amp;", "&"),
        ),
      ),
    ]),
  ];
  await mapLimited(images, async (url) => {
    const { response } = await request(url, { method: "HEAD" });
    if (response.status !== 200 || !response.headers.get("content-type")?.startsWith("image/")) {
      problems.push(`${url}: imagine indisponibilă sau tip invalid (${response.status}).`);
    }
  });

  const feed = resources.get("/google-products.xml");
  const feedLinks = [...feed.matchAll(/<g:link>([^<]+)<\/g:link>/g)].map((match) => match[1]);
  if (!feedLinks.length || feedLinks.some((url) => !productUrls.includes(url))) {
    problems.push("Feedul Merchant este gol sau conține produse în afara sitemapului.");
  }
  for (const [, item] of feed.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const url = item.match(/<g:link>([^<]+)<\/g:link>/)?.[1];
    const offer = pages.find((page) => page.url === url)?.productData?.offers;
    const price = item.match(/<g:price>([\d.]+) ([A-Z]{3})<\/g:price>/);
    const salePrice = item.match(/<g:sale_price>([\d.]+) ([A-Z]{3})<\/g:sale_price>/);
    const effective = salePrice || price;
    if (
      !offer ||
      !effective ||
      Number(effective[1]) !== Number(offer.price) ||
      effective[2] !== offer.priceCurrency
    )
      problems.push(`${url}: prețul Merchant diferă de oferta paginii.`);
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

  const additionalLinks = [...linked].filter((url) => !uniqueUrls.includes(url));
  await mapLimited(additionalLinks, async (url) => {
    const { response } = await request(url);
    if (response.status !== 200) problems.push(`${url}: legătură internă HTTP ${response.status}.`);
  });
  const excludedPaths = [
    "/cont",
    "/comanda",
    "/personalizeaza",
    "/auth",
    "/termeni-de-utilizare",
    "/politica-de-confidentialitate",
  ];
  await mapLimited(excludedPaths, async (path) => {
    const { response, body } = await request(new URL(path, site));
    const robots = `${response.headers.get("x-robots-tag") || ""},${attribute(meta(body, "name", "robots") || "", "content")}`;
    if (
      response.status !== 200 ||
      !robots.includes("noindex") ||
      uniqueUrls.includes(new URL(path, site).href)
    )
      problems.push(
        `${path}: pagina exclusă nu are răspunsul/noindex așteptat sau apare în sitemap.`,
      );
  });
  const missingPaths = [
    "/audit-pagina-inexistenta-20261107",
    "/produs-cutiuta-muzicala-inexistent-20261107",
    "/cadouri/inexistent-20261107",
  ];
  await mapLimited(missingPaths, async (path) => {
    const { response } = await request(new URL(path, site));
    if (response.status !== 404) problems.push(`${path}: HTTP ${response.status} în loc de 404.`);
  });

  console.log(
    JSON.stringify(
      {
        origin: site.origin,
        sitemapUrls: uniqueUrls.length,
        products: productUrls.length,
        merchantProducts: feedLinks.length,
        images: images.length,
        icons: iconPaths.length,
        socialMetadataPages: pages.length,
        orphanPages: orphanPages.length,
        additionalInternalLinks: additionalLinks.length,
        excludedPages: excludedPaths.length,
        missingPages: missingPaths.length,
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
