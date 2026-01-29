# 🔧 FIX: Colonne is_active manquante

## ❌ Problème identifié

L'erreur dans les logs indique :
```
column tasks.is_active does not exist
Could not find the 'is_active' column of 'tasks' in the schema cache
```

**Cause** : La colonne `is_active` n'existe pas encore dans les tables `tasks` et `observations` de la base de données.

## ✅ Solution implémentée

### 1. Migration SQL créée
**Fichier** : `supabase/Migrations/029_add_is_active_columns.sql`

**Contenu** :
- Ajoute `is_active BOOLEAN DEFAULT true` aux tables `tasks` et `observations`
- Crée des index pour les performances
- Met à jour les enregistrements existants avec `is_active = true`
- Ajoute des commentaires de documentation

### 2. Code temporairement adapté

En attendant l'application de la migration :

#### FarmDataCacheService.ts
- **Supprimé** le filtre `{ column: 'is_active', value: true }`
- **Ajouté** un TODO pour le remettre après migration

#### TaskService.ts
- **Remplacé** `is_active: false` par `status: 'archivee'`
- Utilise le champ `status` existant pour le soft delete

#### ObservationService.ts
- **Remplacé** `is_active: false` par `status: 'archived'`
- **Supprimé** les filtres `is_active` temporairement

## 🚀 Étapes suivantes

### 1. Appliquer la migration
```sql
-- Exécuter dans Supabase SQL Editor
\i supabase/Migrations/029_add_is_active_columns.sql
```

### 2. Remettre le code is_active
Une fois la migration appliquée, remettre :

```typescript
// FarmDataCacheService.ts
{ column: 'is_active', value: true }

// TaskService.ts
is_active: false

// ObservationService.ts  
is_active: false
```

### 3. Filtrer les éléments archivés
Ajouter des filtres pour exclure :
- `tasks.status = 'archivee'`
- `observations.status = 'archived'`

## 🎯 Résultat attendu

Après migration :
- ✅ **Soft delete** fonctionnel avec `is_active`
- ✅ **Animation slide-out** opérationnelle
- ✅ **Rollback** en cas d'erreur
- ✅ **UX optimiste** fluide

## 📋 Checklist

- [x] Migration SQL créée
- [x] Code adapté temporairement
- [ ] Migration appliquée en base
- [ ] Code is_active restauré
- [ ] Tests de suppression validés

---

**Note** : La logique d'animation et de rollback fonctionne déjà ! Seule la persistance en base nécessite la migration.

