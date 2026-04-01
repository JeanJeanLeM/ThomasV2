-- Migration 079: Track app version metadata per user for tester visibility

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_app_version TEXT,
  ADD COLUMN IF NOT EXISTS last_build_version TEXT,
  ADD COLUMN IF NOT EXISTS last_runtime_version TEXT,
  ADD COLUMN IF NOT EXISTS last_update_id TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_app_version IS 'Derniere version applicative vue (ex: 2.0.0)';
COMMENT ON COLUMN public.profiles.last_build_version IS 'Dernier build natif vu (android versionCode / ios buildNumber)';
COMMENT ON COLUMN public.profiles.last_runtime_version IS 'Derniere runtimeVersion expo-updates vue';
COMMENT ON COLUMN public.profiles.last_update_id IS 'Dernier updateId OTA expo-updates vu';
COMMENT ON COLUMN public.profiles.last_seen_at IS 'Dernier horodatage de connexion avec version remontee';

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles(last_seen_at DESC);
