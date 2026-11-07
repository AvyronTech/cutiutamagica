UPDATE admin_notifications
SET action_url='/admin/chat?conversation=' || entity_id
WHERE entity_type='chat_conversation' AND entity_id IS NOT NULL
  AND action_url IN ('/admin/chat','/admin/notifications');

UPDATE schema_metadata SET value='74',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
