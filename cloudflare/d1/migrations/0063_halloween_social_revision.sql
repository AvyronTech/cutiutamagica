PRAGMA foreign_keys = ON;

-- Public, immutable delivery URLs for the exact approved revision assets.
-- `usage_type` keeps them separate from the storefront product gallery.
WITH campaign_media (
  id, product_id, media_type, r2_key, alt_text, mime_type, width, height,
  checksum_sha256, rights_status, sort_order, is_primary, title, promo_text_ro,
  file_format, file_size_bytes, original_filename, tags_json, usage_type,
  marketing_approved, public_access, sync_to_avyron, status
) AS (
VALUES
  (
    'social_halloween_20261016_feed_r1', 'product_halloween', 'image',
    'marketing/campaigns/cm-2026-10-16-halloween/r1/feed.png',
    'Cutiuță muzicală Halloween din lemn, deschisă, cu mecanism vizibil, într-un decor de toamnă luminat cald.',
    'image/png', 1080, 1350,
    'aecf27419b8c3c110b023696fab516739fbc4cda4209f1bc8041f9962c36ebce',
    'cleared', 1000, 0, 'Halloween 2026 · feed r1',
    'Cum sună Halloweenul într-o cutiuță?', 'png', 2496544, 'feed.png',
    '["halloween","social","feed","2026"]', 'social', 1, 1, 0, 'active'
  ),
  (
    'social_halloween_20261016_story_1_r1', 'product_halloween', 'image',
    'marketing/campaigns/cm-2026-10-16-halloween/r1/story-1.png',
    'Cutiuță muzicală Halloween într-un cadru vertical cu atmosferă caldă de toamnă.',
    'image/png', 1080, 1920,
    'e4e3b7dd64d02b6456b815e12d9212c2073f6887d7ccf0fa1c29369ef891c72a',
    'cleared', 1001, 0, 'Halloween 2026 · story 1 r1',
    'Un cadou mic. O atmosferă de neuitat.', 'png', 2468420, 'story-1.png',
    '["halloween","social","story","2026"]', 'story', 1, 1, 0, 'active'
  ),
  (
    'social_halloween_20261016_story_2_r1', 'product_halloween', 'image',
    'marketing/campaigns/cm-2026-10-16-halloween/r1/story-2.png',
    'Mecanismul și manivela cutiuței muzicale Halloween, în format vertical.',
    'image/png', 1080, 1920,
    '6a9cf0da80344122b0f2b31ee3fe956e77eb511159c8fee0970da3d9a7140742',
    'cleared', 1002, 0, 'Halloween 2026 · story 2 r1',
    'Rotești manivela. Mecanismul prinde viață, fără baterii.', 'png', 2056244, 'story-2.png',
    '["halloween","social","story","2026"]', 'story', 1, 1, 0, 'active'
  ),
  (
    'social_halloween_20261016_story_3_r1', 'product_halloween', 'image',
    'marketing/campaigns/cm-2026-10-16-halloween/r1/story-3.png',
    'Cutiuță muzicală Halloween în format vertical, cu îndemn spre magazin.',
    'image/png', 1080, 1920,
    'cd46cb0767618f1d61748d5618e3ef8a8aaf2dea18183585734e60a7d8d1c52',
    'cleared', 1003, 0, 'Halloween 2026 · story 3 r1',
    'Magia începe aici.', 'png', 1752612, 'story-3.png',
    '["halloween","social","story","2026"]', 'story', 1, 1, 0, 'active'
  ),
  (
    'social_halloween_20261016_video_r1', 'product_halloween', 'video',
    'marketing/campaigns/cm-2026-10-16-halloween/r1/reel-tiktok-master.mp4',
    'Montaj vertical al cutiuței muzicale Halloween, cu mecanismul și manivela păstrate originale.',
    'video/mp4', 1080, 1920,
    'c6400912633554102edf1c2dd0cf9b564e3938ec8d603c510971d36f73c04325',
    'cleared', 1004, 0, 'Halloween 2026 · Reel și TikTok r1',
    'Cum sună Halloweenul într-o cutiuță?', 'mp4', 1015869, 'reel-tiktok-master.mp4',
    '["halloween","social","reel","tiktok","2026"]', 'social', 1, 1, 0, 'active'
  )
)
INSERT OR IGNORE INTO product_media (
  id, product_id, media_type, r2_key, alt_text, mime_type, width, height,
  checksum_sha256, rights_status, sort_order, is_primary, title, promo_text_ro,
  file_format, file_size_bytes, original_filename, tags_json, usage_type,
  marketing_approved, public_access, sync_to_avyron, status
)
SELECT
  cm.id, cm.product_id, cm.media_type, cm.r2_key, cm.alt_text, cm.mime_type,
  cm.width, cm.height, cm.checksum_sha256, cm.rights_status, cm.sort_order,
  cm.is_primary, cm.title, cm.promo_text_ro, cm.file_format, cm.file_size_bytes,
  cm.original_filename, cm.tags_json, cm.usage_type, cm.marketing_approved,
  cm.public_access, cm.sync_to_avyron, cm.status
FROM campaign_media cm
JOIN products p ON p.id = cm.product_id;

INSERT OR IGNORE INTO social_posts (
  id, account_id, post_type, status, caption, media_json, campaign_json,
  scheduled_at, created_by, approved_by
) VALUES
  (
    'social_cm_20261016_halloween_ig_feed_r1', 'social_instagram_business', 'post', 'approved',
    'Cum sună Halloweenul într-o cutiuță? 🎃\n\nPentru oamenii care iubesc serile de toamnă, poveștile misterioase și obiectele cu personalitate, această cutiuță transformă un gest simplu într-un mic ritual: ridici capacul și rotești manivela.\n\nModelul este realizat din lemn, funcționează mecanic, fără baterii, și păstrează mecanismul vizibil. Ilustrația de Halloween și melodia „This Is Halloween” completează atmosfera unui cadou pentru un fan al sezonului sau pentru o colecție tematică.\n\nDescoperă cutiuța: https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween\n\n#CutiutaMagica #CutiutaMuzicala #HalloweenRomania #CadouHalloween #CadouCuPoveste #DecorDeToamna #CadouSpecial',
    '[{"mediaId":"social_halloween_20261016_feed_r1","r2Key":"marketing/campaigns/cm-2026-10-16-halloween/r1/feed.png","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_feed_r1","sha256":"aecf27419b8c3c110b023696fab516739fbc4cda4209f1bc8041f9962c36ebce"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"instagram","placement":"feed","objective":"conversion","cta":"Descoperă cutiuța","canonicalUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=instagram&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=feed_r1","musicBrief":"dark whimsical / cinematic autumn; platform commercial library only","approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-16T16:45:00.000Z', NULL, NULL
  ),
  (
    'social_cm_20261016_halloween_fb_feed_r1', 'social_facebook_page', 'post', 'approved',
    'Unele cadouri se deschid. Altele pornesc o poveste. 🎃\n\nCutiuța muzicală Halloween este un obiect mic, mecanic și memorabil pentru cine iubește atmosfera de toamnă. Ridici capacul, rotești manivela și mecanismul vizibil redă „This Is Halloween” — fără baterii și fără încărcare.\n\nVezi fotografiile, dimensiunile și disponibilitatea modelului: https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween\n\n#CutiutaMagica #CutiutaMuzicala #HalloweenRomania #CadouHalloween #CadouCuPoveste #DecorDeToamna #MagiaCadourilor',
    '[{"mediaId":"social_halloween_20261016_feed_r1","r2Key":"marketing/campaigns/cm-2026-10-16-halloween/r1/feed.png","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_feed_r1","sha256":"aecf27419b8c3c110b023696fab516739fbc4cda4209f1bc8041f9962c36ebce"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"facebook","placement":"page_feed","objective":"conversion","cta":"Descoperă cutiuța","canonicalUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=facebook&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=feed_r1","musicBrief":null,"approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-16T16:45:00.000Z', NULL, NULL
  ),
  (
    'social_cm_20261016_halloween_ig_story_r1', 'social_instagram_business', 'story', 'approved',
    'Un cadou mic. O atmosferă de neuitat. 🎃\nRotești manivela. Mecanismul prinde viață, fără baterii.\nDescoperă cutiuța.',
    '[{"mediaId":"social_halloween_20261016_story_1_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_story_1_r1"},{"mediaId":"social_halloween_20261016_story_2_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_story_2_r1"},{"mediaId":"social_halloween_20261016_story_3_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_story_3_r1"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"instagram","placement":"story","objective":"conversion","cta":"Descoperă cutiuța","linkStickerUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=instagram&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=story_r1","musicBrief":"dark whimsical / cinematic autumn; platform commercial library only","approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-16T18:30:00.000Z', NULL, NULL
  ),
  (
    'social_cm_20261016_halloween_fb_story_r1', 'social_facebook_page', 'story', 'approved',
    'Un cadou mic. O atmosferă de neuitat. 🎃\nRotești manivela. Mecanismul prinde viață, fără baterii.\nDescoperă cutiuța.',
    '[{"mediaId":"social_halloween_20261016_story_1_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_story_1_r1"},{"mediaId":"social_halloween_20261016_story_2_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_story_2_r1"},{"mediaId":"social_halloween_20261016_story_3_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_story_3_r1"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"facebook","placement":"page_story","objective":"conversion","cta":"Descoperă cutiuța","linkStickerUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=facebook&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=story_r1","musicBrief":"dark whimsical / cinematic autumn; platform commercial library only","approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-16T18:30:00.000Z', NULL, NULL
  ),
  (
    'social_cm_20261016_halloween_ig_reel_r1', 'social_instagram_business', 'reel', 'approved',
    'O manivelă. Un mecanism clasic. O poveste de Halloween care începe la fiecare rotire. Descoperă modelul: https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween\n\n#CutiutaMagica #CutiutaMuzicala #HalloweenRomania #CadouHalloween #CadouCuPoveste #DecorDeToamna',
    '[{"mediaId":"social_halloween_20261016_video_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_video_r1","sha256":"c6400912633554102edf1c2dd0cf9b564e3938ec8d603c510971d36f73c04325"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"instagram","placement":"reel","objective":"conversion","cta":"Descoperă cutiuța","canonicalUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=instagram&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=reel_r1","musicBrief":"dark whimsical / cinematic autumn; platform commercial library only","approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-17T15:30:00.000Z', NULL, NULL
  ),
  (
    'social_cm_20261016_halloween_fb_reel_r1', 'social_facebook_page', 'reel', 'approved',
    'O manivelă. Un mecanism clasic. O poveste de Halloween care începe la fiecare rotire. Descoperă modelul: https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween\n\n#CutiutaMagica #CutiutaMuzicala #HalloweenRomania #CadouHalloween #CadouCuPoveste #DecorDeToamna',
    '[{"mediaId":"social_halloween_20261016_video_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_video_r1","sha256":"c6400912633554102edf1c2dd0cf9b564e3938ec8d603c510971d36f73c04325"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"facebook","placement":"page_reel","objective":"conversion","cta":"Descoperă cutiuța","canonicalUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=facebook&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=reel_r1","musicBrief":"dark whimsical / cinematic autumn; platform commercial library only","approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-17T15:30:00.000Z', NULL, NULL
  ),
  (
    'social_cm_20261016_halloween_tiktok_r1', 'social_tiktok_business', 'video', 'approved',
    'Mică la dimensiuni, mare la atmosferă. Rotești manivela, iar mecanismul clasic prinde viață — fără baterii. Modelul este în linkul din profil / cutiutamagica.eu.\n\n#CutiutaMagica #HalloweenRomania #MusicBox #CadouHalloween #CadouCuPoveste #DecorDeToamna',
    '[{"mediaId":"social_halloween_20261016_video_r1","publicUrl":"https://cutiutamagica.eu/media/social_halloween_20261016_video_r1","sha256":"c6400912633554102edf1c2dd0cf9b564e3938ec8d603c510971d36f73c04325"}]',
    '{"schemaVersion":1,"campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","productId":"product_halloween","platform":"tiktok","placement":"video","objective":"conversion","hook":"Cum sună Halloweenul într-o cutiuță?","cta":"Descoperă cutiuța","canonicalUrl":"https://cutiutamagica.eu/produs-cutiuta-muzicala-halloween","utm":"utm_source=tiktok&utm_medium=organic_social&utm_campaign=halloween_2026&utm_content=video_r1","musicBrief":"mysterious commercial sound from TikTok library only","approvalRequired":true,"connectorRequired":true,"approvalSource":"codex_user_confirmation"}',
    '2026-10-17T17:30:00.000Z', NULL, NULL
  );

INSERT OR IGNORE INTO approval_requests (
  id, request_type, entity_type, entity_id, risk_level, summary,
  proposed_action_json, status, requested_by_agent_id, reviewed_at
) VALUES (
  'approval_cm_20261016_halloween_r1', 'social_publish', 'social_campaign_revision',
  'cm-2026-10-16-halloween:r1', 'high',
  'Revizia 73d9c2 aprobată explicit pentru Instagram, Facebook Page și TikTok.',
  '{"operation":"publish_revision","campaignId":"cm-2026-10-16-halloween","revision":1,"revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","destinations":["social_instagram_business","social_facebook_page","social_tiktok_business"],"socialPostIds":["social_cm_20261016_halloween_ig_feed_r1","social_cm_20261016_halloween_fb_feed_r1","social_cm_20261016_halloween_ig_story_r1","social_cm_20261016_halloween_fb_story_r1","social_cm_20261016_halloween_ig_reel_r1","social_cm_20261016_halloween_fb_reel_r1","social_cm_20261016_halloween_tiktok_r1"],"facebookProfileExcluded":true,"requiresVerifiedConnector":true,"approvalSource":"codex_user_confirmation"}',
  'approved', 'agent_marketing_orders', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

INSERT OR IGNORE INTO ai_runs (
  id, agent_id, trigger_type, input_json, output_json, status,
  token_count, estimated_cost_microunits, completed_at
) VALUES (
  'run_cm_20261016_halloween_r1', 'agent_marketing_orders', 'manual',
  '{"campaignId":"cm-2026-10-16-halloween","revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","approvalSource":"codex_user_confirmation"}',
  '{"status":"approved_assets_synced","socialPostCount":7,"mediaAssetCount":5,"externalPublishing":"pending_verified_connector"}',
  'completed', 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

INSERT OR IGNORE INTO audit_log (
  id, actor_label, action, entity_type, entity_id, after_json, metadata_json
) VALUES (
  'audit_cm_20261016_halloween_r1_approval',
  'Codex · aprobare explicită utilizator',
  'social.campaign_revision.approved_sync', 'social_campaign_revision',
  'cm-2026-10-16-halloween:r1',
  '{"status":"approved","revisionHash":"73d9c246f3b7f0e5e2f22a55c1148ba22fe078af02ed56325c39c0fe3911582c","destinations":["instagram","facebook_page","tiktok"],"facebookProfileExcluded":true}',
  '{"approvalSource":"codex_user_confirmation","externalPublishing":"not_executed_by_migration"}'
);

UPDATE schema_metadata
SET value = '63', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
