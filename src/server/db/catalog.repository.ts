type CatalogRow = Record<string, string | number | null>;

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  mechanismType: string;
  material: string | null;
  sku: string;
  melody: string | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  imageUrl: string | null;
  updatedAt: string;
}

function asString(value: string | number | null | undefined): string {
  return value == null ? "" : String(value);
}

export async function listPublicCatalog(db: D1Database): Promise<CatalogProduct[]> {
  const result = await db
    .prepare(
      `
    SELECT
      p.id,
      p.slug,
      p.name,
      p.short_description,
      p.category,
      p.mechanism_type,
      p.material,
      p.updated_at,
      pv.sku,
      m.title AS melody,
      pli.price_bani,
      CASE WHEN pre.reference_bani=pli.compare_at_bani THEN pli.compare_at_bani END AS compare_at_bani,
      pl.currency,
      (
        SELECT COALESCE(pm.source_url, '/media/' || pm.id)
        FROM product_media pm
        WHERE pm.product_id = p.id
          AND pm.media_type = 'image'
          AND pm.status = 'active'
          AND pm.public_access = 1
          AND pm.rights_status IN ('cleared', 'review_required')
        ORDER BY pm.is_primary DESC, pm.sort_order ASC
        LIMIT 1
      ) AS image_url
    FROM products p
    JOIN product_variants pv ON pv.id=(
      SELECT v.id FROM product_variants v WHERE v.product_id=p.id AND v.status='active' ORDER BY v.sort_order,v.created_at LIMIT 1
    )
    JOIN price_list_items pli ON pli.id=(
      SELECT pi.id FROM price_list_items pi JOIN price_lists l ON l.id=pi.price_list_id JOIN sales_channels c ON c.id=l.channel_id
      WHERE pi.variant_id=pv.id AND pi.min_quantity=1 AND l.status='active' AND c.code='website' AND c.status='active'
      AND (l.starts_at IS NULL OR l.starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      AND (l.ends_at IS NULL OR l.ends_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      ORDER BY l.priority DESC,l.created_at DESC LIMIT 1
    )
    LEFT JOIN price_reference_evidence pre ON pre.price_item_id=pli.id
    JOIN price_lists pl
      ON pl.id = pli.price_list_id
      AND pl.status = 'active'
      AND (pl.starts_at IS NULL OR pl.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      AND (pl.ends_at IS NULL OR pl.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    JOIN sales_channels sc
      ON sc.id = pl.channel_id AND sc.code = 'website' AND sc.status = 'active'
    LEFT JOIN melodies m ON m.id = pv.melody_id
    WHERE p.product_type = 'music_box'
      AND p.status = 'active'
      AND p.published_at IS NOT NULL
    ORDER BY p.name ASC
  `,
    )
    .all<CatalogRow>();

  return result.results.map((row) => ({
    id: asString(row.id),
    slug: asString(row.slug),
    name: asString(row.name),
    shortDescription: asString(row.short_description),
    category: asString(row.category),
    mechanismType: asString(row.mechanism_type),
    material: row.material == null ? null : asString(row.material),
    sku: asString(row.sku),
    melody: row.melody == null ? null : asString(row.melody),
    price: Number(row.price_bani ?? 0) / 100,
    originalPrice: row.compare_at_bani == null ? null : Number(row.compare_at_bani) / 100,
    currency: asString(row.currency) || "RON",
    imageUrl: row.image_url == null ? null : asString(row.image_url),
    updatedAt: asString(row.updated_at),
  }));
}
