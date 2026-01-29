# ☁️ Supabase - Configuration & Guides

Documentation de la configuration Supabase, setup bucket, et diagnostics.

## 📋 Contenu

### **Organisation**
- **ORGANISATION_SUPABASE.md** ⭐ - Organisation dossier supabase/ (structure, scripts, archive)

### **Setup & Configuration**
- **SUPABASE_SETUP.md** ⭐ - Configuration complète Supabase
- **SUPABASE_BUCKET_MANUAL_SETUP.md** - Setup manuel bucket storage

### **Diagnostics & Debug**
- **SUPABASE_MANUAL_DIAGNOSTICS.md** - Diagnostics manuels

## 🎯 Par Où Commencer ?

1. **Comprendre l'organisation** → `ORGANISATION_SUPABASE.md` ⭐
2. **Setup initial** → `SUPABASE_SETUP.md`
3. **Configuration storage** → `SUPABASE_BUCKET_MANUAL_SETUP.md`
4. **Debug** → `SUPABASE_MANUAL_DIAGNOSTICS.md`

## ☁️ Supabase Backend

### **Services Utilisés**

**1. PostgreSQL Database**
- Tables relationnelles
- Row Level Security (RLS)
- Triggers & functions
- Extensions (PostGIS, pgvector)

**2. Authentication**
- Email/Password
- JWT tokens
- User management
- Sessions

**3. Storage (Buckets)**
- Photos observations
- Documents ferme
- Avatars utilisateurs

**4. Edge Functions**
- thomas-agent-v2 (agent IA)
- match-prompt (matching prompts)

**5. Realtime** (prévu)
- Subscriptions
- Notifications temps réel
- Collaboration live

### **Configuration Projet**

```typescript
// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## 🗄️ Schéma Database

### **Tables Principales**

**Users & Farms**
- `profiles` - Profils utilisateurs
- `farms` - Fermes
- `farm_members` - Membres fermes
- `farm_memberships` - Appartenances fermes

**Agricultural Data**
- `plots` - Parcelles
- `cultures` - Cultures
- `containers` - Contenants
- `observations` - Observations
- `tasks` - Tâches

**Documents & Media**
- `documents` - Documents
- `photos` - Photos
- `document_types` - Types documents

**IA & Chat**
- `prompts` - Prompts agent (schéma mcp_prompts)
- `chat_history` - Historique conversations
- `embeddings` - Embeddings pour matching

### **Row Level Security (RLS)**

Toutes les tables ont des policies RLS :

```sql
-- Exemple: Les utilisateurs ne voient que leurs fermes
CREATE POLICY "Users can view their own farms"
ON farms FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM farm_members 
  WHERE farm_id = farms.id
));
```

## 📦 Storage Buckets

### **Configuration Buckets**

**1. photos**
```
Public: No
File size limit: 5MB
Allowed MIME types: image/*
```

**2. documents**
```
Public: No
File size limit: 10MB
Allowed MIME types: application/pdf, image/*, text/*
```

**3. avatars**
```
Public: Yes
File size limit: 2MB
Allowed MIME types: image/*
```

### **Policies Storage**

```sql
-- Users can upload photos to their observations
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND
  auth.uid() IN (
    SELECT user_id FROM farm_members fm
    JOIN observations o ON o.farm_id = fm.farm_id
    WHERE o.id = (storage.foldername(name))[2]::uuid
  )
);
```

## ⚡ Edge Functions

### **thomas-agent-v2**

```typescript
// Deno edge function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { query, context } = await req.json();
  
  // Call Claude API
  const response = await callClaudeAPI(query, context);
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Secrets requis** :
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

### **match-prompt**

Matching de prompts par semantic search (embeddings).

## 🔧 Setup Local

### **1. Installer Supabase CLI**

```bash
npm install -g supabase
```

### **2. Login**

```bash
supabase login
```

### **3. Link projet**

```bash
supabase link --project-ref your-project-ref
```

### **4. Run migrations**

```bash
supabase db push
```

### **5. Deploy edge functions**

```bash
supabase functions deploy thomas-agent-v2
supabase functions deploy match-prompt
```

## 🐛 Diagnostics Courants

### **Erreur RLS**

```
Error: new row violates row-level security policy
```

**Solution** :
1. Vérifier les policies RLS
2. S'assurer que l'utilisateur a les permissions
3. Consulter `SUPABASE_MANUAL_DIAGNOSTICS.md`

### **Erreur Storage**

```
Error: Object not found
```

**Solution** :
1. Vérifier policies storage
2. Vérifier existence bucket
3. Voir `SUPABASE_BUCKET_MANUAL_SETUP.md`

### **Erreur Edge Function**

```
Error: Function returned an error
```

**Solution** :
1. Vérifier logs : `supabase functions logs thomas-agent-v2`
2. Vérifier secrets configurés
3. Tester local : `supabase functions serve thomas-agent-v2`

## 📚 Ressources

- **Migrations** : `../../supabase/Migrations/`
- **Edge Functions** : `../../supabase/functions/`
- **Seeds** : `../../supabase/seeds/`
- **Docs Supabase** : https://supabase.com/docs

---

**4 documents** | Organisation, setup Supabase, bucket storage, diagnostics




