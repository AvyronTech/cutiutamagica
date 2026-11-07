PRAGMA foreign_keys = ON;

ALTER TABLE review_accounts ADD COLUMN birth_month INTEGER CHECK (birth_month BETWEEN 1 AND 12);
ALTER TABLE review_accounts ADD COLUMN birth_day INTEGER CHECK (birth_day BETWEEN 1 AND 31);

CREATE TABLE magic_reward_activities (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 0 AND 100),
  cadence TEXT NOT NULL CHECK (cadence IN ('once', 'per_event', 'daily', 'yearly')),
  period_limit INTEGER NOT NULL DEFAULT 0 CHECK (period_limit BETWEEN 0 AND 100),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  automatic INTEGER NOT NULL DEFAULT 1 CHECK (automatic IN (0, 1)),
  customer_visible INTEGER NOT NULL DEFAULT 1 CHECK (customer_visible IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO magic_reward_activities(
  code,name,description,stars,cadence,period_limit,sort_order
) VALUES
  ('account_created','Cont Magic','Prima filă a poveștii tale.',5,'once',1,10),
  ('gift_profile_completed','Profil de cadouri','Recomandări mai potrivite pentru oamenii dragi.',5,'once',1,20),
  ('first_calendar_event','Primul moment salvat','Calendarul păstrează o aniversare importantă.',5,'once',1,30),
  ('order_delivered','Comandă primită','Stelele apar după livrarea confirmată.',5,'per_event',0,40),
  ('review_approved','Recenzie aprobată','O impresie autentică, publicată după moderare.',3,'per_event',0,50),
  ('social_share','Poveste distribuită','O distribuire pornită din pagina unei cutiuțe.',1,'daily',5,60),
  ('referral_completed','Prieten recomandat','Recomandarea se confirmă după prima livrare eligibilă.',5,'per_event',0,70),
  ('collection_completed','Colecție completată','O poveste întreagă, adunată în cont.',5,'per_event',0,80),
  ('birthday_bonus','Dar aniversar','Un mic bonus în ziua ta.',10,'yearly',1,90);

CREATE TABLE magic_reward_activity_events (
  id TEXT PRIMARY KEY,
  review_account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  activity_code TEXT NOT NULL REFERENCES magic_reward_activities(code) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  period_slot INTEGER NOT NULL DEFAULT 1 CHECK (period_slot BETWEEN 1 AND 100),
  stars INTEGER NOT NULL CHECK (stars > 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(review_account_id, activity_code, source_type, source_id),
  UNIQUE(review_account_id, activity_code, period_key, period_slot)
);

CREATE INDEX magic_reward_activity_events_account_idx
ON magic_reward_activity_events(review_account_id, created_at DESC);

CREATE INDEX magic_reward_activity_events_period_idx
ON magic_reward_activity_events(activity_code, period_key, created_at DESC);

CREATE TRIGGER magic_reward_activity_event_to_ledger
AFTER INSERT ON magic_reward_activity_events
BEGIN
  INSERT INTO magic_star_ledger(
    id,review_account_id,delta,reason,source_type,source_id,note
  )
  SELECT
    'activity-ledger-' || NEW.id,
    NEW.review_account_id,
    NEW.stars,
    'admin_adjustment',
    'reward_activity',
    NEW.id,
    activity.name
  FROM magic_reward_activities activity
  WHERE activity.code=NEW.activity_code;
END;

UPDATE magic_rewards_program
SET stars_for_order=5,
    stars_for_photo_review=3,
    stars_for_referral=5,
    stars_for_gift_profile=5,
    stars_for_collection=5,
    redemption_threshold=5,
    reward_bani=500,
    terms_version='2026-10-04-v2',
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code='magic_stars';

UPDATE promotions
SET value=500,
    description='Beneficiu individual: 1 Magic Star valorează 1 leu la activarea din cont.'
WHERE id='promotion_magic_stars';

UPDATE schema_metadata
SET value='51', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key='schema_version';

PRAGMA optimize;
