-- Migration: Correction des tables analysées - Suppression des doublons
-- Date: 2024-11-24
-- Description: Supprime les tables doublons et crée la table unifiée chat_analyzed_actions

-- ============================================================================
-- ÉTAPE 1: Sauvegarde des données existantes (si nécessaire)
-- ============================================================================

-- Note: Si des données importantes existent dans les tables analysées,
-- décommenter et adapter le code ci-dessous pour les sauvegarder

/*
-- Sauvegarde des données existantes dans une table temporaire
CREATE TEMP TABLE backup_analyzed_data AS 
SELECT 
  'task_done' as action_type,
  analysis_id,
  jsonb_build_object(
    'title', title,
    'action', action,
    'crop', crop,
    'plot_ids', plot_ids,
    'surface_unit_ids', surface_unit_ids,
    'material_ids', material_ids,
    'material_names', material_names,
    'quantity_value', quantity_value,
    'quantity_unit', quantity_unit,
    'duration_minutes', duration_minutes,
    'number_of_people', number_of_people
  ) as action_data,
  matched_entities,
  confidence_score,
  status,
  task_id as created_record_id,
  'task' as created_record_type,
  error_message,
  created_at,
  executed_at
FROM analyzed_tasks_done

UNION ALL

SELECT 
  'task_planned' as action_type,
  analysis_id,
  jsonb_build_object(
    'title', title,
    'action', action,
    'crop', crop,
    'plot_ids', plot_ids,
    'surface_unit_ids', surface_unit_ids,
    'material_ids', material_ids,
    'material_names', material_names,
    'planned_date', planned_date,
    'planned_time', planned_time,
    'duration_minutes', duration_minutes,
    'number_of_people', number_of_people,
    'priority', priority
  ) as action_data,
  matched_entities,
  confidence_score,
  status,
  task_id as created_record_id,
  'task' as created_record_type,
  error_message,
  created_at,
  executed_at
FROM analyzed_tasks_planned

UNION ALL

SELECT 
  'observation' as action_type,
  analysis_id,
  jsonb_build_object(
    'title', title,
    'category', category,
    'nature', nature,
    'crop', crop,
    'plot_ids', plot_ids,
    'surface_unit_ids', surface_unit_ids,
    'severity', severity
  ) as action_data,
  matched_entities,
  confidence_score,
  status,
  observation_id as created_record_id,
  'observation' as created_record_type,
  error_message,
  created_at,
  executed_at
FROM analyzed_observations

UNION ALL

SELECT 
  'harvest' as action_type,
  analysis_id,
  jsonb_build_object(
    'crop', crop,
    'plot_ids', plot_ids,
    'surface_unit_ids', surface_unit_ids,
    'quantity_harvested_value', quantity_harvested_value,
    'quantity_harvested_unit', quantity_harvested_unit,
    'quantity_converted_value', quantity_converted_value,
    'quantity_converted_unit', quantity_converted_unit,
    'conversion_applied', conversion_applied,
    'container_used', container_used,
    'container_count', container_count,
    'quality_grade', quality_grade,
    'harvest_date', harvest_date,
    'harvest_time', harvest_time,
    'weather_conditions', weather_conditions
  ) as action_data,
  matched_entities,
  confidence_score,
  status,
  task_id as created_record_id,
  'task' as created_record_type,
  error_message,
  created_at,
  executed_at
FROM analyzed_harvests;
*/

-- ============================================================================
-- ÉTAPE 2: Suppression des tables doublons
-- ============================================================================

-- Supprimer les contraintes foreign key d'abord (pour éviter les erreurs de référence)
DROP TABLE IF EXISTS public.analyzed_harvests CASCADE;
DROP TABLE IF EXISTS public.analyzed_observations CASCADE; 
DROP TABLE IF EXISTS public.analyzed_tasks_done CASCADE;
DROP TABLE IF EXISTS public.analyzed_tasks_planned CASCADE;

-- ============================================================================
-- ÉTAPE 3: Création de la table unifiée chat_analyzed_actions
-- ============================================================================

CREATE TABLE public.chat_analyzed_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  action_type character varying NOT NULL CHECK (action_type::text = ANY (ARRAY['task_done'::character varying, 'task_planned'::character varying, 'observation'::character varying, 'harvest'::character varying, 'help'::character varying]::text[])),
  action_data jsonb NOT NULL, -- Données parsées de l'action
  matched_entities jsonb DEFAULT '{}'::jsonb, -- Parcelles, matériels matchés
  confidence_score numeric CHECK (confidence_score >= 0::numeric AND confidence_score <= 1::numeric),
  status character varying DEFAULT 'pending' CHECK (status::text = ANY (ARRAY['pending'::character varying, 'validated'::character varying, 'executed'::character varying, 'failed'::character varying]::text[])),
  created_record_id uuid, -- ID de la task/observation créée si exécutée
  created_record_type character varying CHECK (created_record_type IS NULL OR created_record_type::text = ANY (ARRAY['task'::character varying, 'observation'::character varying]::text[])), -- 'task' ou 'observation'
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  executed_at timestamp with time zone,
  CONSTRAINT chat_analyzed_actions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_analyzed_actions_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.chat_message_analyses(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX idx_chat_analyzed_actions_analysis ON public.chat_analyzed_actions(analysis_id);
CREATE INDEX idx_chat_analyzed_actions_type ON public.chat_analyzed_actions(action_type);
CREATE INDEX idx_chat_analyzed_actions_status ON public.chat_analyzed_actions(status);

-- ============================================================================
-- ÉTAPE 4: Ajout de contraintes manquantes aux tables existantes
-- ============================================================================

-- Ajouter la contrainte unique manquante à chat_prompts
ALTER TABLE public.chat_prompts 
ADD CONSTRAINT chat_prompts_name_version_unique UNIQUE (name, version);

-- Vérifier et ajouter les index manquants
CREATE INDEX IF NOT EXISTS idx_chat_prompts_name_active ON public.chat_prompts(name, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_message_analyses_session ON public.chat_message_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_analyses_message ON public.chat_message_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_executions_farm_user ON public.chat_agent_executions(farm_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_executions_session ON public.chat_agent_executions(session_id);

-- ============================================================================
-- ÉTAPE 5: Restauration des données sauvegardées (si applicable)
-- ============================================================================

/*
-- Si des données ont été sauvegardées, les restaurer dans la nouvelle table
INSERT INTO public.chat_analyzed_actions (
  analysis_id,
  action_type,
  action_data,
  matched_entities,
  confidence_score,
  status,
  created_record_id,
  created_record_type,
  error_message,
  created_at,
  executed_at
)
SELECT 
  analysis_id,
  action_type,
  action_data,
  matched_entities,
  confidence_score,
  status,
  created_record_id,
  created_record_type,
  error_message,
  created_at,
  executed_at
FROM backup_analyzed_data;
*/

-- ============================================================================
-- ÉTAPE 6: Mise à jour des prompts pour refléter la nouvelle structure
-- ============================================================================

-- Mise à jour du prompt tool_selection pour utiliser la nouvelle table
UPDATE public.chat_prompts 
SET 
  content = 'Analyse ce message agricole et identifie quels tools utiliser:

Message: "{{user_message}}"

Tools disponibles: {{available_tools}}

Structure de réponse JSON pour chat_analyzed_actions:
{
  "action_type": "task_done|task_planned|observation|harvest|help",
  "action_data": {
    // Données spécifiques selon le type d''action
    "title": "string",
    "action": "string", 
    "crop": "string",
    "plot_reference": "string",
    // Autres champs selon le type
  },
  "confidence": 0.95,
  "reasoning": "Pourquoi cette action"
}',
  version = '1.1',
  updated_at = now()
WHERE name = 'tool_selection' AND is_active = true;

-- ============================================================================
-- COMMENTAIRES MIGRATION
-- ============================================================================

-- Cette migration corrective:
-- 
-- 1. ✅ Supprime les tables doublons (analyzed_*)
-- 2. ✅ Crée la table unifiée chat_analyzed_actions
-- 3. ✅ Ajoute les contraintes et index manquants
-- 4. ✅ Met à jour les prompts pour la nouvelle structure
-- 5. 🔄 Optionnellement sauvegarde/restore les données existantes
--
-- La nouvelle architecture évite les doublons:
-- - chat_analyzed_actions = staging area pour toutes les actions
-- - Tables tasks/observations existantes = source de vérité finale
-- 
-- Workflow: Message → Analyse → Staging (chat_analyzed_actions) → Validation → Tables finales
--
-- Cette approche est plus maintenable et évite la redondance.
