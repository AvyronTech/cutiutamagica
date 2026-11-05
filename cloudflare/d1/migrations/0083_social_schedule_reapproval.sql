PRAGMA foreign_keys = ON;

-- 0082 restored provider-unconfirmed schedules to the last local approval state.
-- Clearing scheduled_at changes the approved action snapshot materially, so those
-- posts must instead return to review and receive a new exact approval before any
-- future scheduling attempt.
UPDATE social_posts
SET status = 'review',
    approved_by = NULL,
    last_error_message = 'Programarea locală nu a fost confirmată în ultima verificare Metricool; postarea necesită o revizie și o aprobare nouă înainte de reprogramare.',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE status = 'approved'
  AND scheduled_at IS NULL
  AND last_error_message LIKE 'Reconciliat la 2026-10-28:%';

UPDATE approval_requests
SET status = 'expired',
    reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE entity_type = 'social_post'
  AND status IN ('pending', 'approved')
  AND entity_id IN (
    SELECT id FROM social_posts
    WHERE status = 'review'
      AND last_error_message = 'Programarea locală nu a fost confirmată în ultima verificare Metricool; postarea necesită o revizie și o aprobare nouă înainte de reprogramare.'
  );

UPDATE schema_metadata SET value='83',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
