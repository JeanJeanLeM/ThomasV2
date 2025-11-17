# 🔧 Guide Configuration Supabase - Thomas V2

## 🎯 Configuration selon TECHNICAL_SPECIFICATIONS.md

### 1. Création Projet Supabase

```bash
# 1. Aller sur https://supabase.com/dashboard
# 2. Créer nouveau projet avec:
#    - Nom: thomas-v2-production
#    - Région: Europe West (eu-west-1) - RGPD compliant
#    - Mot de passe database: [générer sécurisé]
#    - Plan: Pro (pour OAuth providers + Edge Functions)
```

### 2. Configuration Base de Données

#### **Timezone Europe/Paris**
```sql
-- Dans SQL Editor
ALTER DATABASE postgres SET timezone TO 'Europe/Paris';
```

#### **Activer Extensions**
```sql
-- Extensions requises pour Thomas V2
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";      -- Pour géolocalisation fermes
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Pour recherche textuelle
```

### 3. Configuration Auth

#### **Settings généraux**
```bash
Settings > Authentication > General:
✅ Enable email confirmations: ON
✅ Enable email change confirmations: ON  
✅ Secure email change: ON
✅ JWT expiry: 86400 (24h)
✅ Refresh token rotation: ON
✅ Site URL: https://app.thomas-assistant.fr
```

#### **Providers OAuth**

**Google OAuth:**
```bash
Settings > Authentication > Providers > Google:
✅ Enable Google provider: ON
Client ID: [depuis Google Cloud Console]
Client Secret: [depuis Google Cloud Console]
Redirect URL: https://[PROJECT].supabase.co/auth/v1/callback
```

**Apple OAuth:**
```bash
Settings > Authentication > Providers > Apple:
✅ Enable Apple provider: ON
Client ID: [depuis Apple Developer]
Client Secret: [depuis Apple Developer]
```

### 4. Templates Email Français

#### **Template Confirmation Email**
```html
<!-- Dans Settings > Auth > Email Templates > Confirm signup -->
<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
      🌱 Bienvenue sur Thomas V2
    </h1>
    <p style="color: #dcfce7; margin: 10px 0 0 0; font-size: 16px;">
      Votre assistant agricole IA français
    </p>
  </div>
  
  <div style="padding: 40px 20px; background: #f9fafb;">
    <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px;">
      Confirmez votre compte
    </h2>
    
    <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
      Bonjour et bienvenue ! Pour commencer à utiliser Thomas V2, 
      veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #22c55e; color: white; padding: 16px 32px; 
                text-decoration: none; border-radius: 8px; font-weight: 600;
                display: inline-block; font-size: 16px;">
        ✅ Confirmer mon compte
      </a>
    </div>
    
    <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0;">
      Ce lien expire dans 24 heures. Si vous n'avez pas créé ce compte, 
      ignorez cet email.
    </p>
  </div>
  
  <div style="padding: 20px; background: #111827; text-align: center;">
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      © 2024 Thomas V2 - Assistant Agricole IA
    </p>
  </div>
</div>
```

#### **Template Reset Password**
```html
<!-- Dans Settings > Auth > Email Templates > Reset password -->
<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
      🔐 Réinitialisation mot de passe
    </h1>
    <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">
      Thomas V2 - Assistant Agricole
    </p>
  </div>
  
  <div style="padding: 40px 20px; background: #f9fafb;">
    <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px;">
      Nouveau mot de passe
    </h2>
    
    <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
      Vous avez demandé la réinitialisation de votre mot de passe. 
      Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #3b82f6; color: white; padding: 16px 32px; 
                text-decoration: none; border-radius: 8px; font-weight: 600;
                display: inline-block; font-size: 16px;">
        🔑 Nouveau mot de passe
      </a>
    </div>
    
    <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0;">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. 
      Votre mot de passe actuel reste inchangé.
    </p>
  </div>
  
  <div style="padding: 20px; background: #111827; text-align: center;">
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      © 2024 Thomas V2 - Assistant Agricole IA
    </p>
  </div>
</div>
```

#### **Template Magic Link**
```html
<!-- Dans Settings > Auth > Email Templates > Magic Link -->
<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
      ⚡ Connexion rapide
    </h1>
    <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">
      Thomas V2 - Accès sans mot de passe
    </p>
  </div>
  
  <div style="padding: 40px 20px; background: #f9fafb;">
    <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px;">
      Connectez-vous en un clic
    </h2>
    
    <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
      Cliquez sur le lien ci-dessous pour vous connecter instantanément à 
      votre compte Thomas V2, sans saisir de mot de passe.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #f59e0b; color: white; padding: 16px 32px; 
                text-decoration: none; border-radius: 8px; font-weight: 600;
                display: inline-block; font-size: 16px;">
        🚀 Se connecter
      </a>
    </div>
    
    <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0;">
      Ce lien de connexion expire dans 1 heure pour votre sécurité.
    </p>
  </div>
  
  <div style="padding: 20px; background: #111827; text-align: center;">
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      © 2024 Thomas V2 - Assistant Agricole IA
    </p>
  </div>
</div>
```

### 5. Configuration Storage

#### **Buckets requis**
```bash
Storage > Create bucket:

1. Bucket "documents":
   - Public: false
   - File size limit: 10 MB
   - Allowed MIME types: application/pdf, image/*

2. Bucket "photos": 
   - Public: false
   - File size limit: 10 MB
   - Allowed MIME types: image/*

3. Bucket "exports":
   - Public: false  
   - File size limit: 50 MB
   - Allowed MIME types: text/csv, application/pdf
```

#### **Policies RLS Storage**
```sql
-- Dans SQL Editor, créer les policies pour les buckets
-- Policy documents: seul le propriétaire peut accéder
CREATE POLICY "Users can access own documents" ON storage.objects
FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Policy photos: même principe
CREATE POLICY "Users can access own photos" ON storage.buckets
FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 6. Variables d'Environnement

```bash
# À récupérer depuis Supabase Dashboard > Settings > API

# Variables CLIENT (à mettre dans .env avec EXPO_PUBLIC_)
EXPO_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[ANON_PUBLIC_KEY]

# Variables SERVEUR (sans préfixe, Edge Functions seulement) 
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_SECRET]
SUPABASE_PROJECT_ID=[PROJECT_ID]
```

### 7. Test Configuration

#### **Test 1: Connexion database**
```typescript
// Dans App.tsx temporaire pour tester
import { supabase } from '@/utils/supabase';

const testConnection = async () => {
  const { data, error } = await supabase.from('').select('version()').single();
  console.log('Supabase connecté:', !!data);
};
```

#### **Test 2: Auth inscription**
```typescript
import { authService } from '@/services/auth';

const testAuth = async () => {
  const result = await authService.signUp(
    'test@thomas-v2.fr', 
    'TestPassword123!',
    { firstName: 'Test', lastName: 'User' }
  );
  console.log('Auth fonctionne:', result.success);
};
```

---

## ✅ Checklist Configuration

- [ ] ✅ Projet créé région EU avec plan Pro
- [ ] ✅ Database timezone Europe/Paris
- [ ] ✅ Extensions activées (uuid, postgis, pg_trgm)
- [ ] ✅ Auth config: confirmations + JWT 24h
- [ ] ✅ Google OAuth configuré + testé
- [ ] ✅ Apple OAuth configuré + testé  
- [ ] ✅ Templates email français installés
- [ ] ✅ Buckets storage créés avec RLS
- [ ] ✅ Variables environnement renseignées
- [ ] ✅ Tests connexion + auth validés

**🎯 Objectif**: Configuration Supabase production-ready selon spécifications Thomas V2
