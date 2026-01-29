-- Script pour confirmer manuellement un utilisateur
-- À exécuter dans l'éditeur SQL de Supabase Dashboard

-- Confirmer l'email de l'utilisateur test.thomas.v2@gmail.com
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'test.thomas.v2@gmail.com';

-- Vérifier que l'utilisateur est confirmé
SELECT 
  email, 
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'test.thomas.v2@gmail.com';


