-- Thomas V2 - Migration 003: Restore FK constraints for production
-- Run this when you want to restore proper foreign key constraints

-- =============================================
-- RESTORE FOREIGN KEY CONSTRAINTS
-- =============================================

-- WARNING: This will fail if there are invalid UUIDs in the tables
-- Clean up test data first or ensure all UUIDs correspond to real auth.users

-- Restore farms owner constraint
ALTER TABLE public.farms 
ADD CONSTRAINT farms_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Restore farm_members user constraint
ALTER TABLE public.farm_members 
ADD CONSTRAINT farm_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Restore farm_invitations constraints
ALTER TABLE public.farm_invitations 
ADD CONSTRAINT farm_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.farm_invitations 
ADD CONSTRAINT farm_invitations_accepted_by_fkey 
FOREIGN KEY (accepted_by) REFERENCES auth.users(id);

-- Restore profiles constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Restore tasks user constraint
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- =============================================
-- UPDATE COMMENTS
-- =============================================

COMMENT ON TABLE public.farms IS 'Fermes - Entité principale du système multi-tenant';
COMMENT ON TABLE public.farm_members IS 'Membres des fermes avec rôles et permissions';
COMMENT ON TABLE public.farm_invitations IS 'Invitations pour rejoindre une ferme';
COMMENT ON TABLE public.profiles IS 'Profils utilisateurs étendus';
COMMENT ON TABLE public.tasks IS 'Tâches et observations des fermes';

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify constraints are restored
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('farms', 'farm_members', 'farm_invitations', 'profiles', 'tasks')
ORDER BY tc.table_name, tc.constraint_name;
