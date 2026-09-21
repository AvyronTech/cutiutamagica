import { z } from "zod";
import { marketplaceForUrl, researchSettingsSchema } from "@/lib/growth-contracts";
import { credential, readSetting } from "./growth-settings";
import {
  fetchWithTimeout,
  readProviderJson,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";

const searchResult = z.object({
  web: z
    .object({
      results: z
        .array(
          z.object({
            title: z.string().max(2000),
            url: z.string().max(2000),
            description: z.string().max(10000).default(""),
          }),
        )
        .max(30),
    })
    .optional(),
});
const plain = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .slice(0, 1500);
export function rankSupplierResults(
  query: string,
  results: Array<{ title: string; url: string; description: string }>,
) {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2);
  const seen = new Set<string>();
  return results
    .flatMap((result) => {
      const marketplace = marketplaceForUrl(result.url);
      if (!marketplace) return [];
      const url = new URL(result.url);
      url.hash = "";
      for (const key of [...url.searchParams.keys()])
        if (/^(utm_|spm$|aff_|scm$)/.test(key)) url.searchParams.delete(key);
      const canonical = url.toString();
      if (seen.has(canonical)) return [];
      seen.add(canonical);
      const title = plain(result.title),
        evidence = plain(result.description);
      const text = `${title} ${evidence}`.toLowerCase();
      const matches = tokens.filter((t) => text.includes(t)).length;
      if (!matches) return [];
      const relevance = Math.round((matches / Math.max(tokens.length, 1)) * 100);
      // Search snippets are observations, never a confirmed landed cost or seller quotation.
      const priceText =
        evidence.match(
          /(?:US\s*\$|USD|EUR|RON|€|\$)\s*\d[\d.,]*(?:\s*[-–]\s*\d[\d.,]*)?|\d[\d.,]*\s*(?:USD|EUR|RON|lei|€)/i,
        )?.[0] ?? null;
      return [{ url: canonical, marketplace, title, evidence, relevance, priceText }];
    })
    .sort((a, b) => b.relevance - a.relevance || a.url.localeCompare(b.url))
    .slice(0, 5);
}
export async function researchProduct(env: CommerceEnv, productId: string) {
  const settings = await readSetting(env.DB, "supplier_research", researchSettingsSchema);
  if (!settings.enabled)
    throw new Error("Activează cercetarea furnizorilor în setările secțiunii.");
  const key = await credential(env, "brave");
  if (!key) throw new Error("Configurează cheia Brave Search pentru căutarea surselor.");
  const product = await env.DB.prepare(
    "SELECT name,search_terms FROM products WHERE id=?1 AND product_type='music_box'",
  )
    .bind(productId)
    .first<{ name: string; search_terms: string | null }>();
  if (!product) throw new Error("Produsul nu există.");
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE supplier_research_runs SET status='failed',error='Cercetare întreruptă',completed_at=?1 WHERE status='processing' AND created_at<?2",
  )
    .bind(now, new Date(Date.now() - 5 * 60000).toISOString())
    .run();
  const query = `${product.name} hand crank wooden music box`.slice(0, 250);
  const id = crypto.randomUUID();
  const claim = await env.DB.prepare(
    `INSERT INTO supplier_research_runs(id,product_id,query,status,created_at)
    SELECT ?1,?2,?3,'processing',?4 WHERE
      (SELECT COUNT(*) FROM supplier_research_runs WHERE created_at>=?5)<?6 AND
      NOT EXISTS(SELECT 1 FROM supplier_research_runs WHERE product_id=?2 AND
        (status='processing' OR (status='success' AND created_at>?7))) RETURNING id`,
  )
    .bind(
      id,
      productId,
      query,
      now,
      now.slice(0, 10),
      settings.maxDailyRuns,
      new Date(Date.now() - settings.refreshDays * 86400000).toISOString(),
    )
    .first();
  if (!claim)
    throw new Error(
      "Rezultatele sunt încă recente, cercetarea rulează deja sau limita zilnică a fost atinsă.",
    );
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set(
      "q",
      `${query} (site:temu.com OR site:aliexpress.com OR site:alibaba.com)`,
    );
    url.searchParams.set("count", "20");
    const response = await fetchWithTimeout(url, {
      headers: { "X-Subscription-Token": key, accept: "application/json" },
      redirect: "error",
    });
    if (!response.ok) throw new Error(`SEARCH_HTTP_${response.status}`);
    const data = searchResult.parse(await readProviderJson(response));
    const suggestions = rankSupplierResults(query, data.web?.results ?? []);
    await env.DB.batch([
      ...suggestions.map((s, index) =>
        env.DB.prepare(
          `INSERT INTO supplier_suggestions(id,run_id,product_id,rank,url,marketplace,title,evidence,relevance,price_text,checked_at)
        VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
        ).bind(
          crypto.randomUUID(),
          id,
          productId,
          index + 1,
          s.url,
          s.marketplace,
          s.title,
          s.evidence,
          s.relevance,
          s.priceText,
          now,
        ),
      ),
      env.DB.prepare(
        "UPDATE supplier_research_runs SET status='success',completed_at=?2 WHERE id=?1",
      ).bind(id, new Date().toISOString()),
    ]);
    return { count: suggestions.length };
  } catch {
    await env.DB.prepare(
      "UPDATE supplier_research_runs SET status='failed',completed_at=?2,error='Căutare nereușită. Verifică cheia și cota furnizorului.' WHERE id=?1",
    )
      .bind(id, new Date().toISOString())
      .run();
    throw new Error("Cercetarea nu a putut fi finalizată. Rezultatele precedente sunt păstrate.");
  }
}
