PRAGMA foreign_keys = ON;

-- Menține starea beneficiului sincronizată chiar dacă un cod este consumat
-- dintr-un alt flux administrativ sau de checkout.
CREATE TRIGGER magic_star_reward_mark_used
AFTER UPDATE OF status ON promotion_codes
WHEN NEW.status = 'consumed' AND OLD.status != 'consumed'
BEGIN
  UPDATE magic_star_rewards
  SET status = 'used',
      used_at = COALESCE(used_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  WHERE promotion_code_id = NEW.id AND status = 'active';
END;

UPDATE schema_metadata
SET value='49', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key='schema_version';

PRAGMA optimize;
