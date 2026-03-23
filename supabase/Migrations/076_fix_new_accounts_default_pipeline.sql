-- Migration 076: Corriger les comptes dont la config agent a été créée avec 'simple' par défaut
-- Tous les enregistrements créés automatiquement (config_reason contient 'défaut' ou 'première')
-- qui sont encore en mode 'simple' passent en 'pipeline'.

UPDATE public.farm_agent_config
SET
  agent_method  = 'pipeline',
  config_reason = 'Défaut pipeline - migration 076',
  updated_at    = NOW()
WHERE agent_method = 'simple'
  AND (
    config_reason IS NULL
    OR config_reason ILIKE '%défaut%'
    OR config_reason ILIKE '%defaut%'
    OR config_reason ILIKE '%première%'
    OR config_reason ILIKE '%premiere%'
    OR config_reason ILIKE '%first%'
    OR config_reason ILIKE '%default%'
  );
