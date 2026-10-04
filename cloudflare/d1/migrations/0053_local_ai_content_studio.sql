PRAGMA foreign_keys = ON;

-- Local-first AI content studio. This migration stores only public model metadata,
-- sanitized job context and review state. Endpoints, passwords and API keys stay
-- outside D1 in the local runner environment and Cloudflare secrets.
CREATE TABLE ai_model_profiles (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('ollama', 'comfyui')),
  modality TEXT NOT NULL CHECK (modality IN ('text', 'image', 'video')),
  label TEXT NOT NULL,
  runtime_model_id TEXT NOT NULL,
  official_repository_url TEXT NOT NULL,
  license_spdx TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  status TEXT NOT NULL DEFAULT 'setup_required'
    CHECK (status IN ('setup_required', 'active', 'degraded', 'disabled')),
  last_verified_at TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, modality, runtime_model_id)
);

CREATE TABLE ai_generation_jobs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE RESTRICT,
  model_profile_id TEXT NOT NULL REFERENCES ai_model_profiles(id) ON DELETE RESTRICT,
  ai_run_id TEXT REFERENCES ai_runs(id) ON DELETE SET NULL,
  modality TEXT NOT NULL CHECK (modality IN ('text', 'image', 'video')),
  purpose TEXT NOT NULL CHECK (purpose IN ('social_post', 'story', 'reel', 'tiktok', 'campaign', 'product_visual')),
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'instagram', 'tiktok', 'website', 'multi_channel')),
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('1:1', '4:5', '9:16', '16:9')),
  prompt_text TEXT NOT NULL,
  constraints_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(constraints_json)),
  context_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context_snapshot_json)),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'awaiting_review', 'completed', 'failed', 'cancelled')),
  runner_id TEXT,
  output_text TEXT,
  approval_request_id TEXT REFERENCES approval_requests(id) ON DELETE SET NULL,
  requested_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX ai_generation_jobs_queue_idx ON ai_generation_jobs(status, modality, created_at);
CREATE INDEX ai_generation_jobs_product_idx ON ai_generation_jobs(product_id, created_at DESC);

CREATE TABLE ai_generation_assets (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX ai_generation_assets_review_idx ON ai_generation_assets(review_status, created_at);

CREATE TABLE ai_runner_nonces (
  nonce TEXT PRIMARY KEY,
  runner_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX ai_runner_nonces_expiry_idx ON ai_runner_nonces(expires_at);

INSERT OR IGNORE INTO ai_model_profiles (
  id, provider, modality, label, runtime_model_id,
  official_repository_url, license_spdx, settings_json, status
) VALUES
  ('ai_model_qwen3_ollama', 'ollama', 'text', 'Qwen3 · strategie și texte', 'qwen3:8b',
   'https://github.com/QwenLM/Qwen3', 'Apache-2.0',
   '{"role":"orchestrator","structuredOutput":true,"toolCalling":true}', 'setup_required'),
  ('ai_model_qwen_image_comfyui', 'comfyui', 'image', 'Qwen Image · fundaluri și campanii', 'qwen-image',
   'https://github.com/QwenLM/Qwen-Image', 'Apache-2.0',
   '{"workflow":"official_template","protectedProductLayer":true}', 'setup_required'),
  ('ai_model_wan22_comfyui', 'comfyui', 'video', 'Wan 2.2 · video vertical', 'wan2.2',
   'https://github.com/Wan-Video/Wan2.2', 'Apache-2.0',
   '{"workflow":"official_template","protectedProductLayer":true}', 'setup_required');

INSERT OR IGNORE INTO account_connections (
  id, owner, provider, label, auth_method, status, scopes_json, notes, created_at, updated_at
) VALUES
  ('connection_ai_ollama_local', 'cutiuta_magica', 'ollama_local',
   'Ollama local · iMac Cutiuța Magică', 'device_session', 'setup_required',
   '["text.generate","structured_output","tool_calling"]',
   'Endpointul local și modelele sunt verificate prin heartbeat semnat; nicio cheie nu este stocată în D1.',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('connection_ai_comfyui_local', 'cutiuta_magica', 'comfyui_local',
   'ComfyUI local · iMac Cutiuța Magică', 'device_session', 'setup_required',
   '["image.generate","video.generate","workflow.execute"]',
   'Sunt permise doar workflow-uri oficiale aprobate; extensiile terțe nu sunt activate automat.',
   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO operational_settings (key, value_json, version, updated_at)
VALUES (
  'ai.content_studio',
  '{"schemaVersion":1,"runnerMode":"local_pull","approvalRequired":true,"autoPublish":false,"protectProductPixels":true,"allowThirdPartyNodes":false,"allowedKnowledge":["catalog","approved_product_media","delivery_policy","returns_policy","brand_skill"],"blockedKnowledge":["customer_personal_data","admin_secrets","payment_credentials"]}',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- 0051 is owned by the Metricool/GSC agent flow and 0052 by the scoped social account.
-- This migration is applied after both when the integration branches are combined.
UPDATE schema_metadata
SET value = '53', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
