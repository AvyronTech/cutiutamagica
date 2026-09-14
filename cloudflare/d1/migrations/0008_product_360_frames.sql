PRAGMA foreign_keys = ON;

ALTER TABLE product_360_config ADD COLUMN primary_media_id TEXT
  REFERENCES product_media(id) ON DELETE SET NULL;

CREATE TABLE product_360_frames (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL UNIQUE REFERENCES product_media(id) ON DELETE CASCADE,
  frame_index INTEGER NOT NULL CHECK (frame_index >= 0),
  angle_degrees REAL CHECK (angle_degrees IS NULL OR (angle_degrees >= 0 AND angle_degrees < 360)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (product_id, frame_index)
);

CREATE INDEX product_360_frames_media_idx
  ON product_360_frames(media_id);

CREATE TRIGGER product_360_frames_validate_insert
BEFORE INSERT ON product_360_frames
BEGIN
  SELECT (CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM product_media
      WHERE id = NEW.media_id
        AND product_id = NEW.product_id
        AND media_type IN ('image', 'spin_360')
        AND usage_type = '360'
        AND status != 'archived'
    )
    THEN RAISE(ABORT, 'invalid 360 frame media')
  END);
END;

CREATE TRIGGER product_360_frames_validate_update
BEFORE UPDATE OF product_id, media_id ON product_360_frames
BEGIN
  SELECT (CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM product_media
      WHERE id = NEW.media_id
        AND product_id = NEW.product_id
        AND media_type IN ('image', 'spin_360')
        AND usage_type = '360'
        AND status != 'archived'
    )
    THEN RAISE(ABORT, 'invalid 360 frame media')
  END);
END;

UPDATE schema_metadata
SET value = '8', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
