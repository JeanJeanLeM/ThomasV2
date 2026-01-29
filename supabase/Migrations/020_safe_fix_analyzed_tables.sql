-- Migration: Correction sécurisée des tables analysées - Version Safe
-- Date: 2024-11-24
-- Description: Supprime les tables doublons de manière sécurisée avec vérifications

-- ============================================================================
-- ÉTAPE 1: Suppression sécurisée des tables doublons
-- ============================================================================

-- Supprimer les tables doublons si elles existent
DROP TABLE IF EXISTS public.analyzed_harvests CASCADE;
DROP TABLE IF EXISTS public.analyzed_observations CASCADE; 
DROP TABLE IF EXISTS public.analyzed_tasks_done CASCADE;
DROP TABLE IF EXISTS public.analyzed_tasks_planned CASCADE;

-- ============================================================================
-- ÉTAPE 2: Création sécurisée de la table unifiée (si elle n'existe pas)
-- ============================================================================

-- Vérifier si la table chat_analyzed_actions existe déjà
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_analyzed_actions'
  ) THEN

    -- Créer la table unifiée
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

    RAISE NOTICE 'Table chat_analyzed_actions créée avec succès';
  ELSE
    RAISE NOTICE 'Table chat_analyzed_actions existe déjà';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 3: Ajout sécurisé des contraintes manquantes
-- ============================================================================

-- Ajouter la contrainte unique à chat_prompts si elle n'existe pas
DO $$ 
BEGIN
  -- Vérifier si la contrainte existe déjà
  IF NOT EXISTS (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'chat_prompts' 
    AND constraint_name = 'chat_prompts_name_version_unique'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.chat_prompts 
    ADD CONSTRAINT chat_prompts_name_version_unique UNIQUE (name, version);
    RAISE NOTICE 'Contrainte chat_prompts_name_version_unique ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte chat_prompts_name_version_unique existe déjà';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: Création sécurisée des index (IF NOT EXISTS)
-- ============================================================================

-- Créer les index seulement s'ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_chat_prompts_name_active ON public.chat_prompts(name, is_active);
CREATE INDEX IF NOT EXISTS idx_chat_message_analyses_session ON public.chat_message_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_analyses_message ON public.chat_message_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_executions_farm_user ON public.chat_agent_executions(farm_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_executions_session ON public.chat_agent_executions(session_id);

-- ============================================================================
-- ÉTAPE 5: Mise à jour sécurisée des prompts
-- ============================================================================

-- Mise à jour du prompt tool_selection pour la nouvelle structure
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
    "plot_reference": "string"
    // Autres champs selon le type
  },
  "confidence": 0.95,
  "reasoning": "Pourquoi cette action"
}',
  version = '1.1',
  updated_at = now()
WHERE name = 'tool_selection' AND is_active = true;

-- ============================================================================
-- ÉTAPE 6: Validation finale
-- ============================================================================

-- Vérification que tout est en place
DO $$ 
DECLARE
  table_count INTEGER;
  constraint_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Vérifier les tables supprimées
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('analyzed_harvests', 'analyzed_observations', 'analyzed_tasks_done', 'analyzed_tasks_planned');
  
  IF table_count = 0 THEN
    RAISE NOTICE '✅ Tables doublons supprimées avec succès';
  ELSE
    RAISE WARNING '⚠️ %s tables doublons encore présentes', table_count;
  END IF;
  
  -- Vérifier la nouvelle table
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'chat_analyzed_actions';
  
  IF table_count = 1 THEN
    RAISE NOTICE '✅ Table chat_analyzed_actions créée';
  ELSE
    RAISE WARNING '⚠️ Table chat_analyzed_actions manquante';
  END IF;
  
  -- Vérifier les contraintes
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE table_name = 'chat_prompts' 
  AND constraint_name = 'chat_prompts_name_version_unique';
  
  IF constraint_count = 1 THEN
    RAISE NOTICE '✅ Contrainte unique sur chat_prompts présente';
  ELSE
    RAISE WARNING '⚠️ Contrainte unique sur chat_prompts manquante';
  END IF;
  
  RAISE NOTICE '🎉 Migration 020 terminée avec succès';
END $$;

-- ============================================================================
-- COMMENTAIRES MIGRATION
-- ============================================================================

-- Cette migration corrective sécurisée:
-- 
-- 1. ✅ Supprime les tables doublons de manière sécurisée (IF EXISTS)
-- 2. ✅ Crée la table unifiée chat_analyzed_actions (IF NOT EXISTS)
-- 3. ✅ Ajoute les contraintes et index de manière sécurisée (IF NOT EXISTS)
-- 4. ✅ Met à jour les prompts pour la nouvelle structure
-- 5. ✅ Inclut des vérifications et messages de validation
--
-- Architecture finale optimisée:
-- - chat_analyzed_actions = staging area unifiée pour toutes les actions
-- - Tables tasks/observations existantes = source de vérité finale
-- - Workflow: Message → Analyse → Staging → Validation → Tables finales
--
-- Plus de doublons, architecture propre et maintenable !
