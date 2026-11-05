-- Website order items reserve tracked stock in the same transaction as the order.
CREATE TRIGGER website_order_items_validate_availability
BEFORE INSERT ON order_items
WHEN (SELECT channel_id FROM orders WHERE id=NEW.order_id)='channel_website'
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM products p JOIN product_variants pv ON pv.product_id=p.id
  JOIN channel_listings cl ON cl.product_id=p.id AND cl.variant_id=pv.id AND cl.channel_id='channel_website'
  WHERE p.id=NEW.product_id AND pv.id=NEW.variant_id AND p.status='active' AND p.published_at IS NOT NULL
  AND p.storefront_state='available' AND pv.status='active' AND cl.status='active'
 ) THEN RAISE(ABORT,'PRODUCT_UNAVAILABLE') END;
 SELECT CASE WHEN (SELECT inventory_policy FROM product_variants WHERE id=NEW.variant_id)='deny'
 AND COALESCE((SELECT SUM(MAX(0,il.on_hand_quantity-il.reserved_quantity-il.safety_stock_quantity))
 FROM inventory_levels il JOIN stock_locations sl ON sl.id=il.location_id AND sl.active=1 WHERE il.variant_id=NEW.variant_id),0)<NEW.quantity
 THEN RAISE(ABORT,'INSUFFICIENT_STOCK') END;
END;

CREATE TRIGGER website_order_items_reserve_stock
AFTER INSERT ON order_items
WHEN (SELECT channel_id FROM orders WHERE id=NEW.order_id)='channel_website'
 AND (SELECT inventory_policy FROM product_variants WHERE id=NEW.variant_id)='deny'
BEGIN
 INSERT INTO inventory_reservations(id,variant_id,location_id,order_id,quantity,status,expires_at)
 SELECT 'web_stock_'||NEW.id||'_'||location_id,NEW.variant_id,location_id,NEW.order_id,
 MIN(available,NEW.quantity-previous_available),'active',strftime('%Y-%m-%dT%H:%M:%fZ','now','+7 days')
 FROM (
  SELECT il.location_id,MAX(0,il.on_hand_quantity-il.reserved_quantity-il.safety_stock_quantity) AS available,
  COALESCE(SUM(MAX(0,il.on_hand_quantity-il.reserved_quantity-il.safety_stock_quantity)) OVER (ORDER BY il.location_id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS previous_available
  FROM inventory_levels il JOIN stock_locations sl ON sl.id=il.location_id AND sl.active=1 WHERE il.variant_id=NEW.variant_id
 ) WHERE available>0 AND previous_available<NEW.quantity;
END;

CREATE TRIGGER website_order_stock_cancel
AFTER UPDATE OF order_status ON orders
WHEN NEW.order_status='cancelled' AND OLD.order_status!='cancelled'
BEGIN
 UPDATE inventory_reservations SET status='cancelled',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE order_id=NEW.id AND id LIKE 'web_stock_%' AND status='active';
END;

CREATE TRIGGER website_order_stock_ship
AFTER UPDATE OF fulfillment_status,order_status ON orders
WHEN NEW.order_status!='cancelled' AND (NEW.fulfillment_status IN ('shipped','delivered') OR NEW.order_status='completed')
BEGIN
 UPDATE inventory_reservations SET status='consumed',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE order_id=NEW.id AND id LIKE 'web_stock_%' AND status='active';
END;
UPDATE schema_metadata SET value='21' WHERE key='schema_version';
