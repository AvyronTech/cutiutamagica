import { readProductDiscovery, type ProductDiscovery } from "@/lib/product-discovery";
import { mediaApprovalSql } from "../media-policy";
import { productScene, type ProductScene } from "@/lib/product-themes";
type CatalogRow = Record<string, string | number | null>;
export interface CatalogProduct {
  discovery: ProductDiscovery | null;
  scene: ProductScene;
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  story: string;
  shortDescription: string;
  category: string;
  mechanismType: string;
  material: string | null;
  sku: string;
  melody: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  imageUrl: string | null;
  updatedAt: string;
  availability: "available" | "coming_soon" | "out_of_stock";
  collection: "story" | "emotion" | "dedicated";
  sortOrder: number;
  featured: boolean;
  preorderEnabled: boolean;
  releaseNote: string;
  details: string[];
  searchTerms: string[];
  gallery: { src: string; label: string }[];
  seoTitle: string;
  seoDescription: string;
}
const str = (v: unknown) => (v == null ? "" : String(v));
function array<T>(v: unknown): T[] {
  try {
    const a = JSON.parse(String(v || "[]"));
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
export async function listPublicCatalog(
  db: D1Database,
  previewUnreviewedMedia = false,
): Promise<CatalogProduct[]> {
  const result = await db
    .prepare(
      `SELECT p.*,(SELECT json_object('scene',scene,'accent',accent,'occasion',occasion) FROM product_scenes WHERE product_id=p.id) AS scene_json,pv.sku,pv.inventory_policy,COALESCE(NULLIF((SELECT display_name FROM product_audio_config WHERE product_id=p.id),''),m.title) AS melody,
 pli.price_bani,CASE WHEN pre.reference_bani=pli.compare_at_bani THEN pli.compare_at_bani END AS compare_at_bani,
 (SELECT status FROM channel_listings cl WHERE cl.product_id=p.id AND cl.variant_id=pv.id AND cl.channel_id='channel_website' LIMIT 1) AS listing_status,
 (SELECT SUM(MAX(0,on_hand_quantity-reserved_quantity-safety_stock_quantity)) FROM inventory_levels il JOIN stock_locations sl ON sl.id=il.location_id AND sl.active=1 WHERE il.variant_id=pv.id) AS stock,
 (SELECT json_group_array(json_object('src',url,'label',label)) FROM (
 SELECT COALESCE(pm.source_url,'/media/'||pm.id) AS url,COALESCE(pm.alt_text,pm.title,p.name) AS label
 FROM product_media pm WHERE pm.product_id=p.id AND pm.media_type='image' AND pm.status='active' AND pm.public_access=1 AND ${mediaApprovalSql("pm", previewUnreviewedMedia)}
 ORDER BY pm.sort_order,pm.is_primary DESC,pm.created_at DESC
 )) AS gallery_json
 FROM products p
 LEFT JOIN product_variants pv ON pv.id=(SELECT v.id FROM product_variants v WHERE v.product_id=p.id AND v.status='active' ORDER BY v.sort_order,v.created_at LIMIT 1)
 LEFT JOIN price_list_items pli ON pli.id=(SELECT pi.id FROM price_list_items pi JOIN price_lists l ON l.id=pi.price_list_id JOIN sales_channels c ON c.id=l.channel_id WHERE pi.variant_id=pv.id AND pi.min_quantity=1 AND l.status='active' AND c.code='website' AND c.status='active' AND (l.starts_at IS NULL OR l.starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND (l.ends_at IS NULL OR l.ends_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) ORDER BY l.priority DESC,l.created_at DESC LIMIT 1)
 LEFT JOIN price_reference_evidence pre ON pre.price_item_id=pli.id LEFT JOIN melodies m ON m.id=pv.melody_id
 WHERE p.product_type='music_box' AND p.status='active' AND p.published_at IS NOT NULL ORDER BY p.landing_order,p.name`,
    )
    .all<CatalogRow>();
  return result.results.map((r) => {
    const gallery = array<{ src: string; label: string }>(r.gallery_json);
    const sellable =
      r.storefront_state === "available" &&
      r.listing_status === "active" &&
      r.price_bani != null &&
      Number(r.price_bani) > 0 &&
      !(r.inventory_policy === "deny" && (r.stock == null || Number(r.stock) <= 0));
    return {
      discovery: readProductDiscovery(r.discovery_json),
      scene: productScene(str(r.slug), r.scene_json ? JSON.parse(String(r.scene_json)) : undefined),
      id: str(r.id),
      slug: str(r.slug),
      name: str(r.name),
      shortName: str(r.short_name),
      tagline: str(r.tagline),
      description: str(r.description),
      story: str(r.story),
      shortDescription: str(r.short_description),
      category: str(r.category),
      mechanismType: str(r.mechanism_type),
      material: r.material == null ? null : str(r.material),
      sku: str(r.sku),
      melody: r.melody == null ? null : str(r.melody),
      price: r.price_bani == null ? null : Number(r.price_bani) / 100,
      originalPrice: r.compare_at_bani == null ? null : Number(r.compare_at_bani) / 100,
      currency: "RON",
      imageUrl: gallery[0]?.src ?? null,
      updatedAt: str(r.updated_at),
      availability: sellable
        ? "available"
        : r.storefront_state === "coming_soon"
          ? "coming_soon"
          : "out_of_stock",
      collection: r.landing_collection as CatalogProduct["collection"],
      sortOrder: Number(r.landing_order),
      featured: Boolean(r.is_featured),
      preorderEnabled: Boolean(r.preorder_enabled),
      releaseNote: str(r.release_note),
      details: array<string>(r.details_json),
      searchTerms: str(r.search_terms)
        .split(/[,;\n]+/)
        .map((term) => term.trim())
        .filter(Boolean),
      gallery,
      seoTitle: str(r.seo_title),
      seoDescription: str(r.seo_description),
    };
  });
}
