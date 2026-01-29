-- Créer un utilisateur de test avec email confirmé pour tester l'application
-- Ce script doit être exécuté manuellement dans l'interface Supabase

DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Générer un UUID pour l'utilisateur
    user_uuid := gen_random_uuid();
    
    -- Vérifier si l'utilisateur existe déjà
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test.confirmed@gmail.com') THEN
        -- 1. Insérer dans auth.users avec email confirmé
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
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          user_uuid,
          'authenticated',
          'authenticated',
          'test.confirmed@gmail.com',
          crypt('TestPassword123!', gen_salt('bf')),
          NOW(), -- Email confirmé immédiatement
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
          '{"first_name": "Test", "last_name": "Confirmed", "full_name": "Test Confirmed"}',
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
    ELSE
        -- Récupérer l'UUID existant
        SELECT id INTO user_uuid FROM auth.users WHERE email = 'test.confirmed@gmail.com';
    END IF;

    -- 2. Insérer le profil correspondant
    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      created_at,
      updated_at
    ) VALUES (
      user_uuid,
      'test.confirmed@gmail.com',
      'Test',
      'Confirmed',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
    
END $$;
