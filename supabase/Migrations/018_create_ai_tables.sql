-- Migration: Création des tables IA pour Thomas Agent
-- Date: 2024-11-24
-- Description: Tables pour système chat IA avec prompts versionnés et analyses d'actions

-- ============================================================================
-- 1. TABLE CHAT_PROMPTS - Stockage des prompts versionnés
-- ============================================================================
CREATE TABLE public.chat_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL, -- 'thomas_agent_system', 'tool_selection', etc.
  content text NOT NULL,
  examples jsonb DEFAULT '[]'::jsonb,
  version character varying DEFAULT '1.0',
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_prompts_pkey PRIMARY KEY (id),
  CONSTRAINT chat_prompts_name_version_unique UNIQUE (name, version)
);

-- Index pour performance
CREATE INDEX idx_chat_prompts_name_active ON public.chat_prompts(name, is_active);

-- ============================================================================
-- 2. TABLE CHAT_MESSAGE_ANALYSES - Résultats analyse messages
-- ============================================================================
CREATE TABLE public.chat_message_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  message_id uuid NOT NULL,
  user_message text NOT NULL,
  analysis_result jsonb NOT NULL, -- Intent, tools sélectionnés, etc.
  confidence_score numeric CHECK (confidence_score >= 0::numeric AND confidence_score <= 1::numeric),
  processing_time_ms integer,
  model_used character varying DEFAULT 'gpt-4o-mini',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_message_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT chat_message_analyses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  CONSTRAINT chat_message_analyses_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX idx_chat_message_analyses_session ON public.chat_message_analyses(session_id);
CREATE INDEX idx_chat_message_analyses_message ON public.chat_message_analyses(message_id);

-- ============================================================================
-- 3. TABLE CHAT_AGENT_EXECUTIONS - Logs d'exécution agent
-- ============================================================================
CREATE TABLE public.chat_agent_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  farm_id integer NOT NULL,
  message text NOT NULL,
  intent_detected character varying,
  tools_used character varying[] DEFAULT '{}',
  execution_steps jsonb DEFAULT '[]'::jsonb,
  final_response text,
  processing_time_ms integer,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_agent_executions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_agent_executions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  CONSTRAINT chat_agent_executions_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE
);

-- Index pour performance  
CREATE INDEX idx_chat_agent_executions_farm_user ON public.chat_agent_executions(farm_id, user_id);
CREATE INDEX idx_chat_agent_executions_session ON public.chat_agent_executions(session_id);

-- ============================================================================
-- 4. TABLE CHAT_ANALYZED_ACTIONS - Actions analysées (générique)
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
  created_record_type character varying, -- 'task' ou 'observation'
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
-- DONNÉES INITIALES - Prompts de base
-- ============================================================================

-- Prompt système principal
INSERT INTO public.chat_prompts (name, content, examples, version, metadata) VALUES
('thomas_agent_system', 
'Tu es Thomas, assistant agricole français spécialisé dans l''analyse des communications d''agriculteurs.

## Instructions Principales
1. **Analyse chaque message** pour identifier les actions agricoles concrètes
2. **Utilise les tools appropriés** pour chaque action identifiée  
3. **Contextualise avec les données** de l''exploitation (parcelles, matériels, conversions)
4. **Réponds en français naturel** et professionnel
5. **Demande précisions** si informations manquantes critiques

## Types d''Actions Supportées
- **Observations**: Constats terrain (maladies, ravageurs, problèmes)
- **Tâches réalisées**: Travaux effectués (plantation, récolte, traitement)
- **Tâches planifiées**: Travaux à prévoir (avec dates)
- **Récoltes**: Récoltes spécialisées avec quantités et qualité

## Gestion des Erreurs
Si un tool échoue:
1. Explique le problème clairement
2. Propose des solutions alternatives
3. Demande les informations manquantes si nécessaire
4. Continue avec les autres actions si message multiple

Réponds uniquement en français, sois concis mais informatif.',
'[
  {
    "input": "j''ai observé des pucerons sur mes tomates dans la serre 1",
    "analysis": "Une observation agricole avec parcelle spécifique",
    "tools_used": ["create_observation"],
    "expected_output": "J''ai créé une observation pour les pucerons sur vos tomates dans la serre 1."
  }
]'::jsonb,
'1.0',
'{"description": "Prompt système principal Thomas Agent", "created_by": "system"}'::jsonb);

-- Prompt sélection d'outils
INSERT INTO public.chat_prompts (name, content, examples, version, metadata) VALUES
('tool_selection',
'Analyse ce message agricole et identifie quels tools utiliser:

Message: "{{user_message}}"

Tools disponibles: {{available_tools}}

Réponds en JSON avec la structure:
{
  "tools_to_use": [
    {
      "tool_name": "nom_du_tool",
      "confidence": 0.95,
      "parameters": {
        "param1": "valeur1"
      },
      "reasoning": "Pourquoi ce tool"
    }
  ],
  "message_type": "single|multiple|help|unclear"
}',
'[]'::jsonb,
'1.0',
'{"description": "Sélection des tools selon le message", "created_by": "system"}'::jsonb);

-- Prompt classification d'intention
INSERT INTO public.chat_prompts (name, content, examples, version, metadata) VALUES
('intent_classification',
'Classifie l''intention de ce message agricole:

Message: "{{user_message}}"

Intentions possibles:
- observation_creation: Constat terrain, problème observé
- task_done: Tâche déjà réalisée, travail effectué
- task_planned: Tâche à planifier, travail futur
- harvest: Récolte avec quantités
- help: Demande d''aide sur l''application
- management: Gestion parcelles/matériel/conversions

Réponds en JSON:
{
  "intent": "observation_creation",
  "confidence": 0.9,
  "reasoning": "L''utilisateur décrit un problème observé sur ses cultures"
}',
'[]'::jsonb,
'1.0',
'{"description": "Classification d''intention des messages", "created_by": "system"}'::jsonb);

-- ============================================================================
-- COMMENTAIRES MIGRATION
-- ============================================================================

-- Cette migration crée l'infrastructure complète pour le système Thomas Agent:
-- 
-- 1. chat_prompts: Stockage versionnée des prompts système
-- 2. chat_message_analyses: Résultats d'analyse des messages utilisateur
-- 3. chat_agent_executions: Logs complets d'exécution de l'agent
-- 4. chat_analyzed_actions: Actions parsées génériques (avant création tasks/observations)
--
-- WORKFLOW:
-- Message → Analyse → Actions parsées → Validation → Création tasks/observations existantes
-- 
-- Cette approche évite les doublons avec les tables existantes:
-- - Les tables `tasks` et `observations` existantes restent la source de vérité
-- - `chat_analyzed_actions` sert de staging area pour parsing IA
-- - Une fois validées, les actions créent des records dans les vraies tables
--
-- Toutes les tables incluent:
-- - Soft constraints avec CHECK
-- - Foreign keys avec CASCADE appropriées
-- - Index de performance
-- - Champs de confidence et matching
-- - Support complet pour le workflow agent
--
-- Prompts initiaux inclus pour démarrage immédiat du système.
