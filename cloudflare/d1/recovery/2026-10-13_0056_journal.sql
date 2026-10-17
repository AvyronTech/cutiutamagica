-- One-off recovery for the interrupted production application of migration 0056.
-- Do not add this file to migrations_dir or run it against another database.
-- The eight 0056 schema objects and its seed rows were audited against the
-- original migration before this script was prepared. The original migration
-- remains unchanged. Each statement is safe to retry after an uncertain API
-- response; verify the postconditions in the accompanying handoff document.

UPDATE schema_metadata
SET value = '56', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version'
  AND value = '55'
  AND (SELECT COUNT(*) FROM sqlite_master WHERE name IN (
    'ai_model_profiles', 'ai_generation_jobs',
    'ai_generation_jobs_queue_idx', 'ai_generation_jobs_product_idx',
    'ai_generation_assets', 'ai_generation_assets_review_idx',
    'ai_runner_nonces', 'ai_runner_nonces_expiry_idx'
  )) = 8
  AND (SELECT COUNT(*) FROM ai_model_profiles WHERE id IN (
    'ai_model_qwen3_ollama', 'ai_model_qwen_image_comfyui',
    'ai_model_wan22_comfyui'
  )) = 3
  AND (SELECT COUNT(*) FROM account_connections WHERE id IN (
    'connection_ai_ollama_local', 'connection_ai_comfyui_local'
  )) = 2
  AND EXISTS (SELECT 1 FROM operational_settings WHERE key = 'ai.content_studio')
  AND NOT EXISTS (
    SELECT 1 FROM d1_migrations WHERE name = '0056_local_ai_content_studio.sql'
  );

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0056_local_ai_content_studio.sql'
WHERE EXISTS (
    SELECT 1 FROM schema_metadata WHERE key = 'schema_version' AND value = '56'
  )
  AND (SELECT COUNT(*) FROM sqlite_master WHERE name IN (
    'ai_model_profiles', 'ai_generation_jobs',
    'ai_generation_jobs_queue_idx', 'ai_generation_jobs_product_idx',
    'ai_generation_assets', 'ai_generation_assets_review_idx',
    'ai_runner_nonces', 'ai_runner_nonces_expiry_idx'
  )) = 8
  AND (SELECT COUNT(*) FROM ai_model_profiles WHERE id IN (
    'ai_model_qwen3_ollama', 'ai_model_qwen_image_comfyui',
    'ai_model_wan22_comfyui'
  )) = 3
  AND (SELECT COUNT(*) FROM account_connections WHERE id IN (
    'connection_ai_ollama_local', 'connection_ai_comfyui_local'
  )) = 2
  AND EXISTS (SELECT 1 FROM operational_settings WHERE key = 'ai.content_studio');
