-- =====================================================
-- MIGRATION 022: Ajout user_status pour soft delete
-- =====================================================

-- Ajouter le champ user_status à chat_analyzed_actions
ALTER TABLE public.chat_analyzed_actions 
ADD COLUMN IF NOT EXISTS user_status character varying DEFAULT 'pending'::character varying 
CHECK (user_status::text = ANY (ARRAY['pending'::character varying::text, 'validated'::character varying::text, 'rejected'::character varying::text, 'modified'::character varying::text, 'deleted'::character varying::text]));

-- Créer un index pour les requêtes filtrées
CREATE INDEX IF NOT EXISTS idx_chat_analyzed_actions_user_status 
ON public.chat_analyzed_actions(user_status);

-- Mettre à jour les actions existantes pour qu'elles soient 'validated' par défaut (auto-validées)
UPDATE public.chat_analyzed_actions 
SET user_status = 'validated' 
WHERE user_status IS NULL;

-- Ajouter un commentaire pour documenter l'usage
COMMENT ON COLUMN public.chat_analyzed_actions.user_status IS 'Statut utilisateur: pending (en attente), validated (validée), rejected (rejetée), modified (modifiée), deleted (supprimée)';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 022 terminée: user_status ajouté pour soft delete';
END $$;
