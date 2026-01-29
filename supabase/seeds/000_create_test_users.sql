-- Thomas V2 - Create Test Users in auth.users
-- This creates real test users that work with RLS and FK constraints

-- =============================================
-- CREATE TEST USERS IN AUTH.USERS
-- =============================================

DO $$
DECLARE
  thomas_uuid UUID;
  marie_uuid UUID;
  pierre_uuid UUID;
BEGIN
  -- Generate UUIDs for test users
  thomas_uuid := gen_random_uuid();
  marie_uuid := gen_random_uuid();
  pierre_uuid := gen_random_uuid();

  -- Check if users already exist, if not create them
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'thomas.test@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000000',
      thomas_uuid,
      'authenticated',
      'authenticated',
      'thomas.test@gmail.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      '',
      NOW(),
      '',
      NULL,
      '',
      '',
      NULL,
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Thomas", "last_name": "Test", "full_name": "Thomas Test"}',
      false,
      NOW(),
      NOW(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marie.martin@ferme.fr') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000000',
      marie_uuid,
      'authenticated',
      'authenticated',
      'marie.martin@ferme.fr',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      '',
      NOW(),
      '',
      NULL,
      '',
      '',
      NULL,
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Marie", "last_name": "Martin", "full_name": "Marie Martin"}',
      false,
      NOW(),
      NOW(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'pierre.durand@conseil.fr') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES 
    (
      '00000000-0000-0000-0000-000000000000',
      pierre_uuid,
      'authenticated',
      'authenticated',
      'pierre.durand@conseil.fr',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      '',
      NOW(),
      '',
      NULL,
      '',
      '',
      NULL,
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Pierre", "last_name": "Durand", "full_name": "Pierre Durand"}',
      false,
      NOW(),
      NOW(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL
    );
  END IF;

  -- Create profiles for the test users
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name
  ) VALUES 
  (thomas_uuid, 'thomas.test@gmail.com', 'Thomas', 'Test'),
  (marie_uuid, 'marie.martin@ferme.fr', 'Marie', 'Martin'),
  (pierre_uuid, 'pierre.durand@conseil.fr', 'Pierre', 'Durand')
  ON CONFLICT (id) DO NOTHING;

  -- Store UUIDs in a temporary table for the next script
  CREATE TEMP TABLE IF NOT EXISTS test_user_uuids (
    name TEXT,
    uuid UUID
  );
  
  INSERT INTO test_user_uuids VALUES 
  ('thomas', thomas_uuid),
  ('marie', marie_uuid),
  ('pierre', pierre_uuid);

  -- Display the created UUIDs for reference
  RAISE NOTICE 'Test users created:';
  RAISE NOTICE 'Thomas Test: %', thomas_uuid;
  RAISE NOTICE 'Marie Martin: %', marie_uuid;
  RAISE NOTICE 'Pierre Durand: %', pierre_uuid;

END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify users were created
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users 
WHERE email IN (
  'thomas.test@gmail.com',
  'marie.martin@ferme.fr',
  'pierre.durand@conseil.fr'
)
ORDER BY email;
