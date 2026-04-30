-- Migration 073: Configuration rappel tâches quotidiennes
-- Rappel quotidien configurable (heure + jours) sans titre/message custom.

CREATE TABLE IF NOT EXISTS daily_reminder_config (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id     INTEGER     NOT NULL REFERENCES farms(id)      ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Jours d'envoi (0=Dim, 1=Lun … 6=Sam)
  active_days INTEGER[]   NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  -- Heure d'envoi (UTC)
  send_time   TIME        NOT NULL DEFAULT '08:00:00',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder_farm   ON daily_reminder_config(farm_id);
CREATE INDEX IF NOT EXISTS idx_daily_reminder_active ON daily_reminder_config(is_active) WHERE is_active = TRUE;

ALTER TABLE daily_reminder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily reminder"
  ON daily_reminder_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to daily_reminder_config"
  ON daily_reminder_config FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION update_daily_reminder_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_reminder_updated_at ON daily_reminder_config;
CREATE TRIGGER daily_reminder_updated_at
  BEFORE UPDATE ON daily_reminder_config
  FOR EACH ROW EXECUTE FUNCTION update_daily_reminder_updated_at();
