-- Reserve one SmartShip AWB operation per order before calling the external API.
-- An uncertain response is reconciled by order_id, never retried blindly.
CREATE TABLE smartship_awb_requests (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('issuing', 'needs_review', 'issued')),
  awb TEXT,
  requested_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
