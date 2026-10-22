-- Metricool Free does not expose the API. Keep reviewed, dated aggregates separate
-- from connector status and from first-party traffic measurements.
CREATE TABLE social_analytics_snapshots (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL CHECK (brand_id = '7230540'),
  network TEXT NOT NULL CHECK (network IN ('facebook', 'instagram', 'tiktok')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  followers_observed_on TEXT,
  followers INTEGER CHECK (followers IS NULL OR followers >= 0),
  posts INTEGER CHECK (posts IS NULL OR posts >= 0),
  views INTEGER CHECK (views IS NULL OR views >= 0),
  interactions INTEGER CHECK (interactions IS NULL OR interactions >= 0),
  reels INTEGER CHECK (reels IS NULL OR reels >= 0),
  source TEXT NOT NULL DEFAULT 'metricool_reviewed' CHECK (source = 'metricool_reviewed'),
  content_hash TEXT NOT NULL UNIQUE,
  imported_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  imported_at TEXT NOT NULL,
  CHECK (period_start <= period_end),
  CHECK ((followers IS NULL AND followers_observed_on IS NULL) OR
         (followers IS NOT NULL AND followers_observed_on IS NOT NULL))
);

CREATE INDEX social_analytics_snapshots_latest_idx
ON social_analytics_snapshots(network, period_end DESC, imported_at DESC);

-- Baseline read from the official Metricool brand through its connected MCP on
-- 2026-10-19. Sparse days are ignored, not treated as zero for followers.
-- These are dated 29-day aggregates, not live metrics or a Worker API link.
INSERT OR IGNORE INTO social_analytics_snapshots (
  id,brand_id,network,period_start,period_end,followers_observed_on,
  followers,posts,views,interactions,reels,source,content_hash,imported_at
) VALUES
  ('metricool-baseline-fb-20261018','7230540','facebook','2026-09-20','2026-10-18','2026-10-18',
   227,3,691,43,NULL,'metricool_reviewed',
   '3684f10b612558ad76a5d785b8bb73d5bbc55e1aa3c30f216a31fdc19811f250',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('metricool-baseline-ig-20261018','7230540','instagram','2026-09-20','2026-10-18','2026-10-17',
   739,4,665,23,3,'metricool_reviewed',
   'b087465ccd572a161095321f95e3cc06c92f0102fc95bc2f572a860f7e791f9f',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('metricool-baseline-tk-20261018','7230540','tiktok','2026-09-20','2026-10-18','2026-10-17',
   85,4,2870,23,NULL,'metricool_reviewed',
   '5a2974c33208205ce521a7fce6f67db70bf422e896e94aac83b9b76b5e775632',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

UPDATE schema_metadata
SET value = '71', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
