CREATE TABLE product_scenes (
 product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 scene TEXT NOT NULL CHECK(scene IN ('library','winter','sunshine','garden','autumn','forest','starlight','ocean','galaxy')),
 accent TEXT NOT NULL, occasion TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE storefront_messages (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL,
 placement TEXT NOT NULL CHECK(placement IN ('home','products','product','cart')),
 link TEXT NOT NULL DEFAULT '/produse', label TEXT NOT NULL DEFAULT 'Descoperă',
 delay_seconds INTEGER NOT NULL DEFAULT 20 CHECK(delay_seconds BETWEEN 8 AND 120),
 scroll_percent INTEGER NOT NULL DEFAULT 25 CHECK(scroll_percent BETWEEN 0 AND 90),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)), version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO storefront_messages(id,title,message,placement,link,label,enabled) VALUES
 ('message_story','Unele daruri se ascultă.','Descoperă cum o simplă rotire de manivelă prinde viață într-o melodie.','home','/despre-cutiuta','Intră în poveste',1),
 ('message_gift','Pentru cine alegi o amintire?','Fiecare cutiuță are o poveste. Alege-o pe cea care vă aduce mai aproape.','products','/despre-cutiuta','Descoperă cutiuța',0);
CREATE TRIGGER product_interest_admin_notification AFTER INSERT ON product_interest BEGIN
 INSERT INTO admin_notifications(id,notification_type,title,message,entity_type,entity_id,deduplication_key,action_url)
 VALUES('interest_notice_'||NEW.id,'inventory','O cutiuță este așteptată',CASE WHEN NEW.kind='preorder' THEN 'O nouă cerere de precomandă așteaptă răspuns.' ELSE 'Un vizitator dorește să afle când revine produsul.' END,'product',NEW.product_id,'interest_'||NEW.id,'/admin/products/'||NEW.product_id);
END;
UPDATE schema_metadata SET value='22' WHERE key='schema_version';
