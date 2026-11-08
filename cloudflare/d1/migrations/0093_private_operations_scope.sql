-- Separate the full operational configuration (including financial accounts) from dashboard metrics.
-- No user, password, MFA flag or existing role membership is changed.
INSERT OR IGNORE INTO permissions(id,code,description) VALUES
 ('perm_operations_read','operations.read','Vizualizare configurație operațională internă, facturare și conturi financiare');
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
 SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
 WHERE r.code='owner' AND p.code='operations.read';
UPDATE schema_metadata SET value='93',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
