# 🚀 GUIDE MIGRATION THOMAS V2

## 📋 Résumé Migration

La migration Thomas V2 transforme votre base de données actuelle pour supporter toutes les fonctionnalités avancées :

### ✅ Nouvelles Fonctionnalités
- **Unités de Surface LLM** - Planches, rangs avec reconnaissance IA
- **Chat Thomas Multi-Sessions** - Conversations spécialisées
- **Observations Cultures** - Classification automatique IA
- **Planning Avancé** - Tâches futures avec récurrence
- **Conversions Personnalisées** - Unités utilisateur (caisses, bottes, etc.)
- **Sync Offline Robuste** - Queue priorité avec retry
- **Sécurité Multi-Tenant** - RLS complet

## 🎯 EXÉCUTION RAPIDE

### Option 1: Script Automatique (Recommandé)
```bash
# Dans Git Bash ou WSL
./scripts/run_thomas_v2_migration.sh
```

### Option 2: Supabase CLI Manuel
```bash
# Reset + migration complète
supabase db reset
supabase db push

# Ou appliquer uniquement la nouvelle migration
supabase migration new thomas_v2_complete
# Copier le contenu de 004_thomas_v2_complete_migration.sql
supabase db push
```

### Option 3: SQL Direct
```bash
# Via psql direct
psql "$DATABASE_URL" -f supabase/Migrations/004_thomas_v2_complete_migration.sql
```

## 🔍 VÉRIFICATION POST-MIGRATION

### Nouvelles Tables Créées
```sql
-- Vérifier tables principales
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'surface_units', 'chat_sessions', 'chat_messages', 
    'observations', 'planned_tasks', 'user_conversion_units'
);
```

### Extensions Tables Existantes
```sql
-- Vérifier nouvelles colonnes plots
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'plots' 
AND column_name IN ('aliases', 'llm_keywords', 'position');

-- Vérifier nouvelles colonnes tasks
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('action', 'plants', 'surface_unit_ids', 'ai_confidence');
```

### Vues Utiles Créées
```sql
-- Fermes avec statistiques
SELECT * FROM farms_with_stats LIMIT 3;

-- Tâches avec détails complets
SELECT title, farm_name, user_name, plot_names, surface_unit_names 
FROM tasks_with_details 
ORDER BY date DESC LIMIT 5;

-- Sessions chat avec stats
SELECT title, chat_type, message_count, actions_count 
FROM chat_sessions_with_stats;
```

## 🧪 DONNÉES TEST INCLUSES

La migration inclut automatiquement :

### Unités de Surface Auto-Générées
- 6 planches par parcelle serre/tunnel
- 4 rangs par parcelle plein champ
- Codes et aliases optimisés LLM

### Conversions Utilisateur Standards
```
caisse tomate = 8kg
caisse courgette = 6kg
botte radis = 0.5kg
botte carotte = 1kg  
panier salade = 2kg
seau haricot = 3kg
```

### Sessions Chat Thomas
- 1 session générale par ferme
- Messages d'exemple pour test IA

## ⚡ FONCTIONS IA AVANCÉES

### Recherche Floue Parcelles
```sql
-- Rechercher parcelles par texte naturel
SELECT * FROM search_plots_fuzzy(1, 'serre', 0.3);
SELECT * FROM search_plots_fuzzy(1, 'tunnel nord', 0.3);
```

### Recherche Unités Surface Contextuelle
```sql
-- Rechercher avec contexte parcelle
SELECT * FROM search_surface_units_fuzzy(1, 'planche 3', 'serre 1');
SELECT * FROM search_surface_units_fuzzy(1, 'rang A', 'plein champ');
```

## 🔒 SÉCURITÉ RLS

Toutes les nouvelles tables sont sécurisées avec RLS :
- Accès limité aux fermes de l'utilisateur
- Permissions basées sur les rôles
- Isolation complète multi-tenant

## ⚠️ RÉSOLUTION PROBLÈMES

### Erreur "fonction n'existe pas"
```bash
# Réappliquer extensions PostgreSQL
supabase db push --include-all
```

### Tables non créées
```bash
# Vérifier fichier migration
cat supabase/Migrations/004_thomas_v2_complete_migration.sql | head -20

# Réexécuter proprement
supabase db reset
supabase db push
```

### Données test manquantes
```sql
-- Réexécuter section données test manuellement
-- (Section 12 du fichier migration)
```

## 🎉 POST-MIGRATION

### Prochaines Étapes
1. **Tester interface Supabase Dashboard**
2. **Vérifier services TypeScript**  
3. **Démarrer développement chat Thomas**
4. **Implémenter reconnaissance LLM**

### Services à Créer
- `ThomasAIService` - Analyse messages
- `PlotMatchingService` - Reconnaissance parcelles  
- `ChatSessionService` - Gestion conversations
- `ObservationService` - Classifications IA
- `OfflineSyncService` - Queue synchronisation

---

## 🚀 **RÉSULTAT FINAL**

Après migration, vous avez une base de données **Thomas V2 complète** prête pour :
- ✅ Chat IA multi-sessions
- ✅ Reconnaissance parcelles intelligente  
- ✅ Observations avec classification automatique
- ✅ Planning avancé avec récurrence
- ✅ Sync offline robuste
- ✅ Sécurité multi-tenant

**Thomas V2 est prêt pour le développement !** 🎯




