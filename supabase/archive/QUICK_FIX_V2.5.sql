-- QUICK FIX: Upgrade vers v2.5 COMPLET
-- Copier-coller ce fichier dans Dashboard Supabase → SQL Editor
-- Durée: < 5 secondes

-- Désactiver v2.4 incomplète
UPDATE chat_prompts SET is_active = false WHERE name = 'thomas_agent_system' AND version = '2.4';

-- Supprimer v2.5 si existe
DELETE FROM chat_prompts WHERE name = 'thomas_agent_system' AND version = '2.5';
