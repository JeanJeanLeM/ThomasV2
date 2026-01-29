# 🔧 Correction Erreur Foreign Key - Documents

## ❌ Erreur Rencontrée

```
ERROR: 23503: insert or update on table "documents" violates foreign key constraint "documents_farm_id_fkey" 
DETAIL: Key (farm_id)=(1) is not present in table "farms". 16 exists
```

## 🔍 Analyse du Problème

L'erreur indique que :
- ❌ `farm_id = 1` n'existe **PAS** dans la table `farms`
- ✅ `farm_id = 16` **EXISTE** dans la table `farms`

## 🛠️ Solutions Rapides

### **Solution 1 : Utiliser l'ID de ferme existant (16)**

```sql
-- Exécuter le script simple avec l'ID correct
\i supabase/seeds/003_test_documents_simple.sql;
```

### **Solution 2 : Vérifier les données existantes d'abord**

```sql
-- 1. Vérifier quelles fermes existent
\i supabase/seeds/000_check_existing_data.sql;

-- 2. Noter l'ID de ferme recommandé
-- 3. Utiliser cet ID dans vos insertions
```

### **Solution 3 : Requête manuelle pour identifier les fermes**

```sql
-- Voir toutes les fermes disponibles
SELECT id, name, owner_id, is_active 
FROM public.farms 
WHERE is_active = true 
ORDER BY id;

-- Voir les membres de fermes
SELECT fm.farm_id, f.name, fm.user_id, au.email, fm.role
FROM public.farm_members fm
JOIN public.farms f ON fm.farm_id = f.id  
JOIN auth.users au ON fm.user_id = au.id
WHERE fm.is_active = true;
```

## 📝 Scripts Corrigés

### **Script 1 : Vérification des Données**
```bash
# Exécuter pour voir les données disponibles
psql -h your-host -d your-db -f supabase/seeds/000_check_existing_data.sql
```

### **Script 2 : Insertion avec ID Correct**
```bash
# Utilise farm_id = 16 (ID existant)
psql -h your-host -d your-db -f supabase/seeds/003_test_documents_simple.sql
```

### **Script 3 : Insertion Dynamique**
```bash
# Utilise automatiquement la première ferme disponible
psql -h your-host -d your-db -f supabase/seeds/003_test_documents.sql
```

## 🔧 Correction Manuelle

Si vous préférez corriger manuellement :

```sql
-- 1. Identifier la ferme à utiliser
SELECT id, name FROM public.farms WHERE is_active = true LIMIT 1;

-- 2. Identifier l'utilisateur à utiliser  
SELECT id, email FROM auth.users LIMIT 1;

-- 3. Insérer un document de test
INSERT INTO public.documents (
  farm_id,
  user_id, 
  name,
  category,
  file_name,
  file_type,
  file_size,
  file_path
) VALUES (
  16, -- Remplacer par l'ID de ferme trouvé à l'étape 1
  'USER_ID_FROM_STEP_2', -- Remplacer par l'ID utilisateur de l'étape 2
  'Document de Test',
  'autre',
  'test.pdf',
  'pdf',
  1024,
  'documents/test.pdf'
);
```

## ✅ Validation

Après insertion, vérifier que tout fonctionne :

```sql
-- Compter les documents par ferme
SELECT 
  farm_id,
  COUNT(*) as nb_documents,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as taille_mb
FROM public.documents 
WHERE is_active = true
GROUP BY farm_id;

-- Vérifier les catégories
SELECT category, COUNT(*) 
FROM public.documents 
WHERE is_active = true 
GROUP BY category;
```

## 🎯 Recommandation

**Utilisez le script simple** `003_test_documents_simple.sql` qui utilise directement `farm_id = 16` :

```bash
psql -h your-supabase-host -d postgres -f supabase/seeds/003_test_documents_simple.sql
```

Ce script :
- ✅ Utilise l'ID de ferme existant (16)
- ✅ Insère 8 documents de test variés
- ✅ Affiche un résumé des insertions
- ✅ Vérifie les catégories créées

## 📊 Résultat Attendu

Après exécution réussie :
```
✅ Documents insérés avec succès
nombre_documents: 8
taille_totale_mb: 37.24
farm_id: 16
```

**Problème résolu !** Les documents de test seront maintenant disponibles dans l'interface. 🎉









