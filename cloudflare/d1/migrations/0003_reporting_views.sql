PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS v_admin_product_catalog;
CREATE VIEW v_admin_product_catalog AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.category,
  p.status,
  p.mechanism_type,
  p.rights_status,
  p.updated_at,
  (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') AS variant_count,
  (
    SELECT MIN(pli.price_bani)
    FROM price_list_items pli
    JOIN product_variants pv ON pv.id = pli.variant_id
    WHERE pv.product_id = p.id AND pv.status = 'active'
  ) AS min_price_bani,
  (
    SELECT MAX(pli.price_bani)
    FROM price_list_items pli
    JOIN product_variants pv ON pv.id = pli.variant_id
    WHERE pv.product_id = p.id AND pv.status = 'active'
  ) AS max_price_bani,
  COALESCE((
    SELECT SUM(via.available_quantity)
    FROM v_inventory_available via
    WHERE via.product_id = p.id AND via.available_quantity IS NOT NULL
  ), 0) AS available_quantity,
  CASE WHEN EXISTS (
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = p.id AND pv.status = 'active' AND pv.inventory_policy = 'untracked'
  ) THEN 1 ELSE 0 END AS has_untracked_inventory,
  (
    SELECT COUNT(*) FROM channel_listings cl
    WHERE cl.product_id = p.id AND cl.status = 'active'
  ) AS listing_count
FROM products p
WHERE p.product_type = 'music_box';

DROP VIEW IF EXISTS v_admin_order_list;
CREATE VIEW v_admin_order_list AS
SELECT
  o.id,
  o.order_number,
  o.public_token,
  o.channel_id,
  sc.name AS channel_name,
  sc.code AS channel_code,
  o.external_order_id,
  o.customer_name,
  o.customer_email,
  o.customer_phone_e164,
  o.order_status,
  o.payment_status,
  o.fulfillment_status,
  o.currency,
  o.total_bani,
  o.paid_bani,
  o.refunded_bani,
  o.placed_at,
  o.updated_at,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS line_count,
  COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) AS units_count,
  (
    SELECT GROUP_CONCAT(item_summary, ', ')
    FROM (
      SELECT oi.product_name || ' x' || oi.quantity AS item_summary
      FROM order_items oi
      WHERE oi.order_id = o.id
      ORDER BY oi.created_at ASC, oi.id ASC
    )
  ) AS products_summary,
  (
    SELECT s.awb FROM shipments s
    WHERE s.order_id = o.id AND s.awb IS NOT NULL
    ORDER BY s.created_at DESC LIMIT 1
  ) AS awb,
  (
    SELECT s.status FROM shipments s
    WHERE s.order_id = o.id
    ORDER BY s.created_at DESC LIMIT 1
  ) AS shipment_status
FROM orders o
JOIN sales_channels sc ON sc.id = o.channel_id;

DROP VIEW IF EXISTS v_admin_monthly_sales;
CREATE VIEW v_admin_monthly_sales AS
SELECT
  substr(o.placed_at, 1, 7) AS month,
  o.channel_id,
  sc.name AS channel_name,
  COUNT(*) AS orders_count,
  COALESCE(SUM((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id)), 0) AS units_count,
  SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_bani ELSE 0 END) AS revenue_bani,
  SUM(o.discount_bani) AS discount_bani,
  SUM(o.refunded_bani) AS refunded_bani
FROM orders o
JOIN sales_channels sc ON sc.id = o.channel_id
GROUP BY substr(o.placed_at, 1, 7), o.channel_id;

UPDATE schema_metadata
SET value = '3', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
