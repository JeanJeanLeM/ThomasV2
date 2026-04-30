-- Migration 071: Configure pg_cron pour send-notifications
-- Appelle l'edge function send-notifications toutes les 5 minutes

-- S'assurer que les extensions sont activées
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Supprimer l'ancien job s'il existe (idempotent)
SELECT cron.unschedule('send-push-notifications')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-push-notifications'
);

-- Créer le cron job : toutes les 5 minutes
SELECT cron.schedule(
  'send-push-notifications',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://kvwzbofifqqytyfertkh.supabase.co/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'SUPABASE_CRON_AUTH_TOKEN'
          LIMIT 1
        )
      ),
      body    := '{}'::jsonb
    )
  $$
);
