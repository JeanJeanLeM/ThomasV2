-- Migration 052: Supprimer le tool harvest (redondant avec task_done + quantité)
-- Date: 2026-02-06
-- Description: harvest = task_done avec quantité, pas besoin de tool séparé

-- ============================================================================
-- 1. METTRE À JOUR intent_classification v3.0
-- ============================================================================

UPDATE chat_prompts
SET content = REPLACE(
  content,
  '### harvest
**Indicateurs**: "récolté" + quantité explicite
**Règle**: Récolte avec quantité chiffrée (kg, L, caisses, etc.)
Exemples: "j''ai récolté 10 kg de tomates", "récolté 3 caisses de courgettes"
**IMPORTANT**: Si "récolté" AVEC quantité = harvest',
  '### harvest (supprimé - utiliser task_done)
**Note**: Une récolte est une task_done avec quantité. Classez toujours en task_done.'
)
WHERE name = 'intent_classification'
  AND version = '3.0'
  AND is_active = true;

-- Mettre à jour les règles de classification
UPDATE chat_prompts
SET content = REPLACE(
  content,
  '## RÈGLES DE CLASSIFICATION:

1. Si verbe agricole au passé + durée/outil = **task_done**
2. Si "récolté" + quantité = **harvest**
3. Si "récolté" sans quantité = **task_done**',
  '## RÈGLES DE CLASSIFICATION:

1. Si verbe agricole au passé (y compris "récolté") = **task_done**
2. La quantité est une propriété de task_done, pas un intent séparé'
)
WHERE name = 'intent_classification'
  AND version = '3.0'
  AND is_active = true;

-- ============================================================================
-- 2. METTRE À JOUR tool_selection v3.0
-- ============================================================================

-- Retirer create_harvest des outils disponibles
UPDATE chat_prompts
SET content = REPLACE(
  content,
  'Pour harvest:
- crop: culture récoltée
- quantity: {value: number, unit: "kg"|"caisses"|etc}
- plot_reference: parcelle
- quality: excellent|good|fair|poor (optionnel)',
  '-- harvest supprimé: utiliser create_task_done avec quantity'
)
WHERE name = 'tool_selection'
  AND version = '3.0'
  AND is_active = true;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Outil harvest supprimé : harvest = task_done avec quantité';
END $$;
