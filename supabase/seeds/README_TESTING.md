# Guide de Test Complet - Thomas V2 Database

## 🎯 Ordre d'exécution pour les tests

### **Étape 1 : Migration de base**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/migrations/001_farms_multi_tenant.sql
```
✅ Crée toutes les tables avec RLS et contraintes FK

### **Étape 2 : Supprimer les contraintes FK pour les tests**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/migrations/002_remove_fk_for_testing.sql
```
✅ Supprime les contraintes FK vers `auth.users` pour permettre les données de test

### **Étape 3 : Désactiver RLS (optionnel)**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/seeds/disable_rls_for_testing.sql
```
✅ Désactive RLS pour voir les données sans authentification

### **Étape 4 : Insérer les données de test**
```sql
-- Exécuter dans Supabase Dashboard > SQL Editor
supabase/seeds/001_simple_test_data.sql
```
✅ Insère les données de test avec UUIDs fictifs

### **Étape 5 : Vérifier les données**
```sql
-- Vérifier que tout fonctionne
SELECT 'Farms' as table_name, COUNT(*) as count FROM public.farms
UNION ALL
SELECT 'Plots', COUNT(*) FROM public.plots
UNION ALL
SELECT 'Materials', COUNT(*) FROM public.materials
UNION ALL
SELECT 'Tasks', COUNT(*) FROM public.tasks;
```

**Résultat attendu :**
```
table_name | count
-----------|------
Farms      | 3
Plots      | 8
Materials  | 8
Tasks      | 4
```

## 🧪 Tests des services TypeScript

Une fois les données en place, tu peux tester les services :

```typescript
// Test de base
const farms = await FarmService.getUserFarms();
console.log('Fermes trouvées:', farms.length);

// Test des parcelles
const plots = await PlotService.getFarmPlots(1);
console.log('Parcelles ferme 1:', plots.length);
```

## 🔄 Nettoyage après tests

### **Option A : Supprimer les données de test**
```sql
-- Supprimer toutes les données de test
DELETE FROM public.tasks WHERE farm_id IN (1, 2, 3);
DELETE FROM public.materials WHERE farm_id IN (1, 2, 3);
DELETE FROM public.plots WHERE farm_id IN (1, 2, 3);
DELETE FROM public.farms WHERE id IN (1, 2, 3);
```

### **Option B : Réactiver RLS**
```sql
-- Réactiver RLS si désactivé
supabase/seeds/enable_rls_after_testing.sql
```

### **Option C : Restaurer les contraintes FK**
```sql
-- ⚠️ ATTENTION: Supprimer d'abord les données avec UUIDs fictifs
-- Puis restaurer les contraintes pour la production
supabase/migrations/003_restore_fk_constraints.sql
```

## 🚀 Passage en production

Pour passer en production avec de vrais utilisateurs :

1. **Nettoyer les données de test**
2. **Restaurer les contraintes FK** (migration 003)
3. **Réactiver RLS** si désactivé
4. **Créer les vrais utilisateurs** via Supabase Auth
5. **Tester l'authentification** complète

## ⚠️ Avertissements

- **Ne jamais** exécuter `002_remove_fk_for_testing.sql` en production
- **Toujours** nettoyer les données de test avant la production
- **Vérifier** que RLS est activé avant le déploiement
- **Tester** l'authentification avec de vrais utilisateurs

## 🔧 Dépannage

### Problème : "Foreign key constraint violation"
**Solution :** Exécuter la migration 002 pour supprimer les contraintes FK

### Problème : "Données invisibles malgré l'insertion"
**Solution :** Désactiver RLS temporairement avec `disable_rls_for_testing.sql`

### Problème : "Cannot restore FK constraints"
**Solution :** Nettoyer d'abord les données avec UUIDs fictifs

### Problème : "RLS policies blocking access"
**Solution :** Créer de vrais utilisateurs ou désactiver RLS pour les tests
