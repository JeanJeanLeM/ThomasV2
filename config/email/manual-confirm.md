# Confirmer manuellement l'utilisateur

## 🔧 Étapes à suivre :

### 1. Allez dans Supabase Dashboard
- URL : https://supabase.com/dashboard/project/kvwzbofifqqytyfertkh/sql/new

### 2. Exécutez cette requête SQL :

```sql
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
```

### 3. Résultat attendu :
- L'utilisateur devrait avoir `email_confirmed_at` et `confirmed_at` avec une date/heure
- Vous pourrez ensuite vous connecter avec `test.thomas.v2@gmail.com` / `TestPassword123!`

### 4. Test de connexion :
- Revenez sur l'application : http://localhost:8081
- Connectez-vous avec les identifiants
- Vous devriez voir l'application complète avec la navigation !

## 🚀 Alternative : Google OAuth
Si vous préférez, vous pouvez aussi utiliser "Continuer avec Google" qui ne nécessite pas de confirmation d'email.


