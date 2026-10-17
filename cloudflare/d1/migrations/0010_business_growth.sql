PRAGMA foreign_keys = ON;

CREATE TABLE operational_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE integration_credentials (
  provider TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL,
  checked_at TEXT,
  check_status TEXT NOT NULL DEFAULT 'unverified' CHECK(check_status IN ('unverified','verified','failed'))
);

CREATE TABLE business_activity (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES admin_users(id),
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX business_activity_date_idx ON business_activity(created_at DESC);

CREATE TABLE owner_report_deliveries (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('processing','sent','failed','review_required')),
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_error TEXT,
  UNIQUE(month,recipient)
);
CREATE INDEX owner_report_status_idx ON owner_report_deliveries(status,updated_at);

CREATE TABLE supplier_research_runs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('processing','success','failed')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
);
CREATE INDEX supplier_research_product_idx ON supplier_research_runs(product_id,created_at DESC);
CREATE INDEX supplier_research_budget_idx ON supplier_research_runs(created_at);
CREATE UNIQUE INDEX supplier_research_running_idx ON supplier_research_runs(product_id) WHERE status='processing';

CREATE TABLE supplier_suggestions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES supplier_research_runs(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK(rank BETWEEN 1 AND 5),
  url TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  title TEXT NOT NULL,
  evidence TEXT NOT NULL,
  relevance INTEGER NOT NULL CHECK(relevance BETWEEN 0 AND 100),
  price_text TEXT,
  price_status TEXT NOT NULL DEFAULT 'unverified' CHECK(price_status IN ('unverified','seller_confirmed')),
  checked_at TEXT NOT NULL,
  UNIQUE(run_id,url),
  UNIQUE(run_id,rank)
);
CREATE INDEX supplier_suggestions_product_idx ON supplier_suggestions(product_id,checked_at DESC);

CREATE TABLE traffic_daily_metrics (
  source TEXT NOT NULL,
  property_id TEXT NOT NULL,
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL CHECK(value>=0),
  imported_at TEXT NOT NULL,
  PRIMARY KEY(source,property_id,day,metric)
);
CREATE INDEX traffic_metrics_day_idx ON traffic_daily_metrics(day,source);

UPDATE schema_metadata SET value='10',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
PRAGMA optimize;
