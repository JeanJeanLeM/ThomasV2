-- Thomas V2 - Migration 002: Remove FK constraints for testing
-- This allows inserting test data without real auth.users

-- =============================================
-- REMOVE FOREIGN KEY CONSTRAINTS FOR TESTING
-- =============================================

-- Remove the foreign key constraint from farms to auth.users
ALTER TABLE public.farms DROP CONSTRAINT IF EXISTS farms_owner_id_fkey;

-- Remove the foreign key constraint from farm_members to auth.users  
ALTER TABLE public.farm_members DROP CONSTRAINT IF EXISTS farm_members_user_id_fkey;

-- Remove the foreign key constraint from farm_invitations to auth.users
ALTER TABLE public.farm_invitations DROP CONSTRAINT IF EXISTS farm_invitations_invited_by_fkey;
ALTER TABLE public.farm_invitations DROP CONSTRAINT IF EXISTS farm_invitations_accepted_by_fkey;

-- Remove the foreign key constraint from profiles to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Remove the foreign key constraint from tasks to auth.users
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;

-- =============================================
-- ADD COMMENTS TO TRACK REMOVED CONSTRAINTS
-- =============================================

COMMENT ON TABLE public.farms IS 'Fermes - FK vers auth.users supprimée pour tests';
COMMENT ON TABLE public.farm_members IS 'Membres fermes - FK vers auth.users supprimée pour tests';
COMMENT ON TABLE public.farm_invitations IS 'Invitations fermes - FK vers auth.users supprimée pour tests';
COMMENT ON TABLE public.profiles IS 'Profils - FK vers auth.users supprimée pour tests';
COMMENT ON TABLE public.tasks IS 'Tâches - FK vers auth.users supprimée pour tests';

-- =============================================
-- NOTES
-- =============================================

/*
IMPORTANT: Cette migration supprime les contraintes FK vers auth.users pour permettre
l'insertion de données de test avec des UUIDs fictifs.

En production, vous devriez :
1. Créer de vrais utilisateurs via Supabase Auth
2. Restaurer les contraintes FK avec une migration inverse
3. Ou utiliser des triggers pour valider les UUIDs

Pour restaurer les contraintes plus tard :

ALTER TABLE public.farms 
ADD CONSTRAINT farms_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.farm_members 
ADD CONSTRAINT farm_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- etc...
*/
