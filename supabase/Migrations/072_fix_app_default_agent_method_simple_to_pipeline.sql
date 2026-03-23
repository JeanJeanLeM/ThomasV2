-- Migration 072: Aligner les configs créées par l'app mobile (ancien défaut "simple")
-- sur le défaut produit "pipeline", sans toucher aux choix utilisateur explicites.

UPDATE public.farm_agent_config
SET
  agent_method = 'pipeline',
  config_reason = 'Configuration par défaut - première utilisation (pipeline)'
WHERE agent_method = 'simple'
  AND config_reason = 'Configuration par défaut - première utilisation';
