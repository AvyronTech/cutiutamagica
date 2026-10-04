-- Local preview is separate from publication; preserve the existing rights constraint.
ALTER TABLE story_scene_settings ADD COLUMN preview_enabled INTEGER NOT NULL DEFAULT 0
  CHECK(preview_enabled IN (0,1) AND (preview_enabled=0 OR audio_asset_id IS NOT NULL));
