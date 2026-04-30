-- Migration 072: Configuration notification d'inactivité
-- Envoie une notification le matin si aucune tâche/observation n'a été
-- ajoutée la veille (sur un jour "attendu" configuré par l'utilisateur).

CREATE TABLE IF NOT EXISTS inactivity_notification_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id     INTEGER     NOT NULL REFERENCES farms(id)      ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Jours où des tâches sont attendues (0=Dim, 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam)
  active_days INTEGER[]   NOT NULL DEFAULT '{1,2,3,4,5,6}',
  -- Heure à laquelle la notif est envoyée le lendemain matin (UTC)
  send_time   TIME        NOT NULL DEFAULT '10:00:00',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, farm_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_inactivity_config_farm   ON inactivity_notification_config(farm_id);
CREATE INDEX IF NOT EXISTS idx_inactivity_config_active ON inactivity_notification_config(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE inactivity_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inactivity config"
  ON inactivity_notification_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to inactivity_config"
  ON inactivity_notification_config FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_inactivity_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inactivity_config_updated_at ON inactivity_notification_config;
CREATE TRIGGER inactivity_config_updated_at
  BEFORE UPDATE ON inactivity_notification_config
  FOR EACH ROW EXECUTE FUNCTION update_inactivity_config_updated_at();
