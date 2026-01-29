-- Disable RLS temporarily for testing with seed data
-- WARNING: Only use this in development/testing environments

-- Disable RLS on all tables
ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('farms', 'farm_members', 'farm_invitations', 'profiles', 'plots', 'materials', 'tasks');

-- Expected result: rowsecurity = false for all tables
