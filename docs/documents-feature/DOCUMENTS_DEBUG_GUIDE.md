# 🔧 Guide de Débogage - Système de Documents

## ❌ Problème Résolu : `farm_id=eq.undefined`

### **Erreur Initiale**
```
GET https://kvwzbofifqqytyfertkh.supabase.co/rest/v1/documents?select=*&farm_id=eq.undefined&is_active=eq.true&order=created_at.desc 400 (Bad Request)

Erreur: invalid input syntax for type integer: "undefined"
```

### **Cause du Problème**
L'interface `UserFarm` utilise `farm_id` et non `id` :
```typescript
// ❌ INCORRECT
activeFarm.id  // undefined

// ✅ CORRECT  
activeFarm.farm_id  // number
```

### **Solution Appliquée**
```typescript
// Dans DocumentsScreen.tsx
const loadDocuments = async () => {
  if (!activeFarm || !activeFarm.farm_id) {  // ✅ farm_id au lieu de id
    console.log('Pas de ferme active ou ID manquant:', activeFarm);
    return;
  }

  const documentsData = await documentService.getDocumentsByFarm(activeFarm.farm_id);
  const statsData = await documentService.getDocumentStats(activeFarm.farm_id);
};
```

## 🛠️ Vérifications de Débogage

### **1. Vérifier la Structure UserFarm**
```typescript
// Interface UserFarm (SimpleInitService.ts)
export interface UserFarm {
  farm_id: number;    // ✅ Utiliser farm_id
  farm_name: string;
  role: string;
  is_owner: boolean;
}
```

### **2. Vérifier le Contexte FarmContext**
```typescript
const { activeFarm } = useFarm();
console.log('Active Farm:', activeFarm);
// Doit afficher : { farm_id: 1, farm_name: "Ma Ferme", role: "owner", is_owner: true }
```

### **3. Vérifier la Table Documents**
```sql
-- Vérifier que la table existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'documents';

-- Vérifier la structure
\d public.documents;

-- Vérifier les données
SELECT COUNT(*) FROM public.documents;
```

### **4. Vérifier les Permissions RLS**
```sql
-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'documents';

-- Tester l'accès utilisateur
SELECT * FROM public.documents WHERE farm_id = 1 LIMIT 1;
```

## 🔍 Tests de Validation

### **Test 1 : Chargement des Documents**
```typescript
// Dans la console du navigateur
const { activeFarm } = useFarm();
console.log('Farm ID:', activeFarm?.farm_id);

// Doit afficher un nombre, pas undefined
```

### **Test 2 : Service DocumentService**
```typescript
// Test direct du service
import { documentService } from '../services/DocumentService';

const testDocuments = async () => {
  try {
    const docs = await documentService.getDocumentsByFarm(1);
    console.log('Documents:', docs);
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

### **Test 3 : Requête Supabase Directe**
```typescript
// Test de la requête Supabase
import { supabase } from '../utils/supabase';

const testSupabase = async () => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('farm_id', 1)
    .eq('is_active', true);
    
  console.log('Data:', data);
  console.log('Error:', error);
};
```

## 📊 Données de Test

### **Créer des Documents de Test**
```sql
-- Exécuter le fichier de seed
\i supabase/seeds/003_test_documents.sql;

-- Ou insérer manuellement
INSERT INTO public.documents (
  farm_id, user_id, name, category, file_name, file_type, file_size, file_path
) VALUES (
  1, 
  (SELECT id FROM auth.users LIMIT 1),
  'Document de Test',
  'autre',
  'test.pdf',
  'pdf',
  1024,
  'documents/test.pdf'
);
```

### **Vérifier les Données**
```sql
-- Compter les documents par ferme
SELECT farm_id, COUNT(*) as nb_documents 
FROM public.documents 
WHERE is_active = true 
GROUP BY farm_id;

-- Statistiques complètes
SELECT 
  farm_id,
  COUNT(*) as total_documents,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as total_size_mb,
  COUNT(DISTINCT category) as categories_count
FROM public.documents 
WHERE is_active = true 
GROUP BY farm_id;
```

## 🚨 Erreurs Communes

### **Erreur 1 : `activeFarm` est `null`**
```typescript
// Cause : Utilisateur pas connecté ou pas de ferme
// Solution : Vérifier l'authentification et l'initialisation des fermes

if (!activeFarm) {
  console.log('Pas de ferme active - vérifier l\'auth et l\'init');
  return;
}
```

### **Erreur 2 : Table `documents` n'existe pas**
```sql
-- Vérifier l'existence
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'documents'
);

-- Si false, exécuter la migration
\i supabase/Migrations/005_add_documents_table.sql;
```

### **Erreur 3 : Permissions RLS**
```sql
-- Vérifier que l'utilisateur est membre de la ferme
SELECT fm.* FROM public.farm_members fm 
WHERE fm.user_id = auth.uid() AND fm.farm_id = 1 AND fm.is_active = true;

-- Si vide, ajouter l'utilisateur à la ferme
INSERT INTO public.farm_members (farm_id, user_id, role, is_active)
VALUES (1, auth.uid(), 'owner', true);
```

### **Erreur 4 : Types TypeScript**
```typescript
// Vérifier les imports
import { Document, DocumentCategory } from '../services/DocumentService';
import { useFarm } from '../contexts/FarmContext';

// Vérifier les types
const { activeFarm }: { activeFarm: UserFarm | null } = useFarm();
```

## ✅ Checklist de Validation

- [ ] `activeFarm.farm_id` est un nombre valide
- [ ] Table `documents` existe dans Supabase
- [ ] Politiques RLS configurées correctement
- [ ] Utilisateur est membre de la ferme
- [ ] Service DocumentService fonctionne
- [ ] Interface DocumentsScreen charge les données
- [ ] Statistiques s'affichent correctement
- [ ] Actions (supprimer, partager) fonctionnent

## 🔧 Outils de Débogage

### **Console Logs Utiles**
```typescript
// Dans DocumentsScreen.tsx
console.log('Active Farm:', activeFarm);
console.log('Farm ID:', activeFarm?.farm_id);
console.log('Documents loaded:', documents.length);
console.log('Stats:', stats);
```

### **Requêtes SQL de Debug**
```sql
-- État général
SELECT 
  'Utilisateur connecté' as check_type,
  auth.uid() as user_id,
  CASE WHEN auth.uid() IS NOT NULL THEN '✅' ELSE '❌' END as status
UNION ALL
SELECT 
  'Fermes disponibles',
  COUNT(*)::text,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
FROM public.farm_members fm 
WHERE fm.user_id = auth.uid() AND fm.is_active = true
UNION ALL
SELECT 
  'Documents disponibles',
  COUNT(*)::text,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END
FROM public.documents d
JOIN public.farm_members fm ON d.farm_id = fm.farm_id
WHERE fm.user_id = auth.uid() AND fm.is_active = true AND d.is_active = true;
```

**Le système de documents fonctionne maintenant avec les vraies données !** 🎉

**Version** : 2.1  
**Dernière mise à jour** : Novembre 2024  
**Status** : ✅ Problème résolu













