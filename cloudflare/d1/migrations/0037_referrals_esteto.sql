PRAGMA foreign_keys = ON;

-- Referral rewards become available only after an order has been delivered.
CREATE TABLE referral_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  trigger_status TEXT NOT NULL DEFAULT 'delivered'
    CHECK (trigger_status = 'delivered'),
  friend_reward_bani INTEGER NOT NULL DEFAULT 1500
    CHECK (friend_reward_bani > 0),
  advocate_reward_bani INTEGER NOT NULL DEFAULT 1500
    CHECK (advocate_reward_bani > 0),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  code_valid_days INTEGER NOT NULL DEFAULT 180
    CHECK (code_valid_days BETWEEN 1 AND 730),
  friend_usage_limit INTEGER NOT NULL DEFAULT 1
    CHECK (friend_usage_limit BETWEEN 1 AND 20),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE referral_codes (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES referral_campaigns(id) ON DELETE RESTRICT,
  advocate_customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  source_order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'expired', 'depleted')),
  usage_limit INTEGER NOT NULL DEFAULT 1 CHECK (usage_limit BETWEEN 1 AND 20),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (used_count <= usage_limit)
);

CREATE INDEX referral_codes_advocate_idx
ON referral_codes(advocate_customer_id, created_at DESC);
CREATE INDEX referral_codes_status_idx
ON referral_codes(status, expires_at);

CREATE TABLE referral_redemptions (
  id TEXT PRIMARY KEY,
  referral_code_id TEXT NOT NULL REFERENCES referral_codes(id) ON DELETE RESTRICT,
  referred_customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  referred_order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  friend_discount_bani INTEGER NOT NULL CHECK (friend_discount_bani > 0),
  advocate_reward_bani INTEGER NOT NULL CHECK (advocate_reward_bani > 0),
  advocate_reward_promotion_code_id TEXT UNIQUE REFERENCES promotion_codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'qualified', 'rejected', 'released')),
  reserved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  qualified_at TEXT,
  released_at TEXT,
  rejection_reason TEXT
);

CREATE TRIGGER referral_redemptions_prevent_self_referral
BEFORE INSERT ON referral_redemptions
WHEN EXISTS (
  SELECT 1 FROM referral_codes
  WHERE id = NEW.referral_code_id
    AND advocate_customer_id = NEW.referred_customer_id
)
BEGIN
  SELECT RAISE(ABORT, 'REFERRAL_SELF_USE_NOT_ALLOWED');
END;

CREATE TRIGGER referral_redemptions_require_available_code
BEFORE INSERT ON referral_redemptions
WHEN NOT EXISTS (
  SELECT 1 FROM referral_codes
  WHERE id = NEW.referral_code_id
    AND status = 'active'
    AND used_count < usage_limit
    AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
BEGIN
  SELECT RAISE(ABORT, 'REFERRAL_CODE_UNAVAILABLE');
END;

CREATE TRIGGER promotion_code_redemptions_require_available_code
BEFORE INSERT ON promotion_redemptions
WHEN NEW.promotion_code_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM promotion_codes
  WHERE id = NEW.promotion_code_id
    AND status = 'active'
    AND (usage_limit IS NULL OR used_count < usage_limit)
)
BEGIN
  SELECT RAISE(ABORT, 'PROMOTION_CODE_UNAVAILABLE');
END;

CREATE INDEX referral_redemptions_code_idx
ON referral_redemptions(referral_code_id, status, reserved_at DESC);
CREATE INDEX referral_redemptions_customer_idx
ON referral_redemptions(referred_customer_id, status, reserved_at DESC);

INSERT INTO promotions (
  id, name, description, promotion_type, value, status, priority,
  stack_mode, per_customer_limit
) VALUES
  ('promotion_referral_friend_15', 'Referral · prieten 15 lei',
   'Reducere acordată prietenului printr-un cod emis numai după o comandă livrată.',
   'fixed', 1500, 'active', 90, 'exclusive', 1),
  ('promotion_referral_advocate_15', 'Referral · recomandare 15 lei',
   'Recompensă acordată recomandantului după livrarea comenzii prietenului.',
   'fixed', 1500, 'active', 90, 'exclusive', 1);

INSERT INTO promotion_targets (id, promotion_id, target_type, target_id, exclusion) VALUES
  ('target_referral_friend_website', 'promotion_referral_friend_15', 'channel', 'channel_website', 0),
  ('target_referral_advocate_website', 'promotion_referral_advocate_15', 'channel', 'channel_website', 0);

INSERT INTO referral_campaigns (
  id, name, status, friend_reward_bani, advocate_reward_bani,
  currency, code_valid_days, friend_usage_limit
) VALUES (
  'referral_after_delivery_15',
  'Ai făcut pe cineva fericit?',
  'active', 1500, 1500, 'RON', 180, 1
);

-- Esteto exposes marketplace synchronization by API, but its concrete endpoint contract
-- is supplied to merchants after account approval. Keep the connector inactive until then.
INSERT OR IGNORE INTO sales_channels (
  id, code, name, channel_type, connection_mode, status, currency,
  capabilities_json, settings_json
) VALUES (
  'channel_esteto', 'esteto', 'Esteto Marketplace', 'marketplace', 'api',
  'setup_required', 'RON',
  '["pullOrders","pushProduct","pushOffer","pushInventory","pushFulfillment","reconcile"]',
  '{"activation":"requires_partner_account_and_api_contract"}'
);

INSERT OR IGNORE INTO integration_accounts (
  id, channel_id, provider, environment, account_label, status,
  secret_reference, config_json, capabilities_json
) VALUES (
  'integration_esteto_production', 'channel_esteto', 'esteto', 'production',
  'Esteto Marketplace', 'setup_required', 'ESTETO_API_KEY',
  '{"account_id":"","api_base_url":"","contract_status":"awaiting_credentials"}',
  '["pullOrders","pushProduct","pushOffer","pushInventory","pushFulfillment","reconcile"]'
);

INSERT OR IGNORE INTO provider_configurations (
  id, provider, capability, environment, secret_binding_names_json,
  settings_json, status
) VALUES (
  'provider_esteto_production', 'esteto', 'marketplace', 'production',
  '["ESTETO_API_KEY"]',
  '{"account_id":"","api_base_url":"","activation":"requires_partner_api_contract"}',
  'setup_required'
);

UPDATE schema_metadata
SET value = '37', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
