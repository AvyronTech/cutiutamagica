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
    JOIN product_variants pv
      ON pv.product_id = p.id AND pv.status = 'active'
    JOIN price_list_items pli
      ON pli.variant_id = pv.id AND pli.min_quantity = 1
    JOIN price_lists pl
      ON pl.id = pli.price_list_id
      AND pl.status = 'active'
      AND (pl.starts_at IS NULL OR pl.starts_at <= datetime('now'))
      AND (pl.ends_at IS NULL OR pl.ends_at > datetime('now'))
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
    currency: asString(row.currency) || "RON",
    imageUrl: row.image_url == null ? null : asString(row.image_url),
    updatedAt: asString(row.updated_at),
  }));
}
