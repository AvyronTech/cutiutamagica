-- Keep administrator edits; only adapt the untouched original story prompt.
UPDATE storefront_messages SET delay_seconds=26,scroll_percent=0,version=version+1,
 updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='message_story' AND version=1 AND delay_seconds=20 AND scroll_percent=25
 AND title='Unele daruri se ascultă.';
INSERT OR IGNORE INTO storefront_messages(id,title,message,placement,link,label,delay_seconds,scroll_percent,enabled) VALUES
 ('message_welcome','O lume mică, doar a ta.','Alege cutiuța după universul care te emoționează. Lemn, manivelă și o melodie de păstrat aproape.','home','/produse','Descoperă cutiuțele',8,0,1),
 ('message_gift_home','Pentru cine păstrezi magia?','Pentru un fan, un colecționar sau cineva drag. Un cadou poate începe cu o poveste pe care o iubiți amândoi.','home','/produse','Alege o poveste',48,0,1);
UPDATE schema_metadata SET value='26' WHERE key='schema_version';
