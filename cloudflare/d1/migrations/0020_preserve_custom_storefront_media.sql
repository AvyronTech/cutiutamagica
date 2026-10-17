-- Imported references never take priority over images already customized in the dashboard.
UPDATE product_media SET status='archived',public_access=0,archived_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id LIKE 'editorial_%' AND EXISTS (
 SELECT 1 FROM product_media custom WHERE custom.product_id=product_media.product_id
 AND custom.id NOT LIKE 'editorial_%' AND custom.media_type='image'
 AND custom.status='active' AND custom.public_access=1 AND custom.version>1
);
UPDATE schema_metadata SET value='20' WHERE key='schema_version';
