PRAGMA foreign_keys = ON;

ALTER TABLE product_reviews ADD COLUMN photo_r2_key TEXT;

CREATE TABLE magic_rewards_program (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  stars_for_order INTEGER NOT NULL DEFAULT 1 CHECK (stars_for_order BETWEEN 0 AND 20),
  stars_for_photo_review INTEGER NOT NULL DEFAULT 1 CHECK (stars_for_photo_review BETWEEN 0 AND 20),
  stars_for_referral INTEGER NOT NULL DEFAULT 1 CHECK (stars_for_referral BETWEEN 0 AND 20),
  stars_for_gift_profile INTEGER NOT NULL DEFAULT 1 CHECK (stars_for_gift_profile BETWEEN 0 AND 20),
  stars_for_collection INTEGER NOT NULL DEFAULT 1 CHECK (stars_for_collection BETWEEN 0 AND 20),
  redemption_threshold INTEGER NOT NULL DEFAULT 5 CHECK (redemption_threshold BETWEEN 1 AND 100),
  reward_bani INTEGER NOT NULL DEFAULT 1500 CHECK (reward_bani BETWEEN 100 AND 100000),
  reward_valid_days INTEGER NOT NULL DEFAULT 180 CHECK (reward_valid_days BETWEEN 1 AND 730),
  terms_version TEXT NOT NULL DEFAULT '2026-10-04',
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO magic_rewards_program(code, name)
VALUES ('magic_stars', 'Magic Stars')
ON CONFLICT(code) DO NOTHING;

INSERT INTO promotions(
  id, name, description, promotion_type, value, status, priority, stack_mode,
  per_customer_limit
) VALUES(
  'promotion_magic_stars', 'Magic Stars · recompensă',
  'Beneficiu generat individual la răscumpărarea stelelor confirmate.',
  'fixed', 1500, 'active', 30, 'exclusive', 1
)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE magic_star_accounts (
  review_account_id TEXT PRIMARY KEY REFERENCES review_accounts(id) ON DELETE CASCADE,
  available_stars INTEGER NOT NULL DEFAULT 0 CHECK (available_stars >= 0),
  lifetime_stars INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_stars >= 0),
  redeemed_stars INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_stars >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE magic_star_ledger (
  id TEXT PRIMARY KEY,
  review_account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL CHECK (delta != 0),
  reason TEXT NOT NULL CHECK (reason IN (
    'order_delivered', 'photo_review_approved', 'referral_completed',
    'gift_profile_completed', 'collection_completed', 'reward_redeemed', 'admin_adjustment'
  )),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  note TEXT,
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(review_account_id, reason, source_type, source_id)
);

CREATE INDEX magic_star_ledger_account_idx
ON magic_star_ledger(review_account_id, created_at DESC);

CREATE TRIGGER magic_star_ledger_apply_insert
AFTER INSERT ON magic_star_ledger
BEGIN
  INSERT INTO magic_star_accounts(
    review_account_id, available_stars, lifetime_stars, redeemed_stars, updated_at
  ) VALUES(
    NEW.review_account_id,
    MAX(0, NEW.delta),
    MAX(0, NEW.delta),
    MAX(0, -NEW.delta),
    NEW.created_at
  )
  ON CONFLICT(review_account_id) DO UPDATE SET
    available_stars = magic_star_accounts.available_stars + NEW.delta,
    lifetime_stars = magic_star_accounts.lifetime_stars + MAX(0, NEW.delta),
    redeemed_stars = magic_star_accounts.redeemed_stars + MAX(0, -NEW.delta),
    updated_at = NEW.created_at;
END;

CREATE TRIGGER magic_star_ledger_no_overdraft
BEFORE INSERT ON magic_star_ledger
WHEN NEW.delta < 0
BEGIN
  SELECT CASE WHEN COALESCE((
    SELECT available_stars FROM magic_star_accounts WHERE review_account_id=NEW.review_account_id
  ), 0) + NEW.delta < 0 THEN RAISE(ABORT, 'MAGIC_STARS_INSUFFICIENT') END;
END;

CREATE TABLE magic_star_rewards (
  id TEXT PRIMARY KEY,
  review_account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  ledger_id TEXT NOT NULL UNIQUE REFERENCES magic_star_ledger(id) ON DELETE RESTRICT,
  promotion_code_id TEXT REFERENCES promotion_codes(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  stars_spent INTEGER NOT NULL CHECK (stars_spent > 0),
  value_bani INTEGER NOT NULL CHECK (value_bani > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX magic_star_rewards_account_idx
ON magic_star_rewards(review_account_id, status, created_at DESC);

CREATE TABLE gift_profiles (
  review_account_id TEXT PRIMARY KEY REFERENCES review_accounts(id) ON DELETE CASCADE,
  preferences_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(preferences_json)),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE gift_calendar_events (
  id TEXT PRIMARY KEY,
  review_account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  occasion TEXT NOT NULL CHECK (occasion IN (
    'birthday_partner', 'relationship_anniversary', 'child_day', 'christmas',
    'secret_santa', 'birthday', 'other'
  )),
  person_name TEXT NOT NULL CHECK (length(person_name) BETWEEN 1 AND 80),
  event_month INTEGER NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day INTEGER NOT NULL CHECK (event_day BETWEEN 1 AND 31),
  reminder_days_json TEXT NOT NULL DEFAULT '[12,3]' CHECK (json_valid(reminder_days_json)),
  email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(review_account_id, occasion, person_name, event_month, event_day)
);

CREATE INDEX gift_calendar_due_idx
ON gift_calendar_events(active, email_enabled, event_month, event_day);

CREATE TABLE gift_reminder_dispatches (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES gift_calendar_events(id) ON DELETE CASCADE,
  reminder_year INTEGER NOT NULL,
  days_before INTEGER NOT NULL CHECK (days_before BETWEEN 0 AND 90),
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  provider_operation_key TEXT NOT NULL UNIQUE,
  sent_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(event_id, reminder_year, days_before)
);

-- Tarifele comerciale confirmate pentru România. SmartShip rămâne sursa
-- listei Easybox; checkoutul folosește tariful fix, fără a depinde de o
-- cotație variabilă pentru finalizarea comenzii.
UPDATE shipping_policy_configs
SET standard_price_bani = 2500,
    locker_price_bani = 1500,
    easybox_enabled = 1,
    use_live_quotes = 0,
    validation_status = 'verified',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'RO_STANDARD';

-- Reduceri reale: prețul curent devine prețul anterior, iar prețul de
-- vânzare scade efectiv cu 10–20 lei. Condițiile protejează ajustările
-- făcute între timp din dashboard.
INSERT OR IGNORE INTO price_change_history(
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261004_real_' || id, id, price_bani,
  CASE id
    WHEN 'price_hp_keeper_1' THEN 13900
    WHEN 'price_got_winter_1' THEN 12900
    WHEN 'price_kitten_1' THEN 11900
    WHEN 'price_halloween_1' THEN 12400
    WHEN 'price_sunshine_1' THEN 11900
  END,
  'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE (id='price_hp_keeper_1' AND price_bani=14900)
   OR (id='price_got_winter_1' AND price_bani=14900)
   OR (id='price_kitten_1' AND price_bani=12900)
   OR (id='price_halloween_1' AND price_bani=13900)
   OR (id='price_sunshine_1' AND price_bani=12900);

UPDATE price_list_items
SET compare_at_bani = price_bani,
    price_bani = CASE id
      WHEN 'price_hp_keeper_1' THEN 13900
      WHEN 'price_got_winter_1' THEN 12900
      WHEN 'price_kitten_1' THEN 11900
      WHEN 'price_halloween_1' THEN 12400
      WHEN 'price_sunshine_1' THEN 11900
    END,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE (id='price_hp_keeper_1' AND price_bani=14900)
   OR (id='price_got_winter_1' AND price_bani=14900)
   OR (id='price_kitten_1' AND price_bani=12900)
   OR (id='price_halloween_1' AND price_bani=13900)
   OR (id='price_sunshine_1' AND price_bani=12900);

INSERT INTO price_reference_evidence(price_item_id, reference_bani, evidence, approved_by, approved_at)
SELECT id, compare_at_bani,
       'Preț de vânzare public existent imediat înaintea reducerii reale din 2026-10-04; modificarea este înregistrată în price_change_history.',
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id IN ('price_hp_keeper_1','price_got_winter_1','price_kitten_1','price_halloween_1','price_sunshine_1')
  AND compare_at_bani - price_bani BETWEEN 1000 AND 2000
ON CONFLICT(price_item_id) DO UPDATE SET
  reference_bani=excluded.reference_bani,
  evidence=excluded.evidence,
  approved_by=excluded.approved_by,
  approved_at=excluded.approved_at;

UPDATE schema_metadata
SET value='48', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key='schema_version';

PRAGMA optimize;
